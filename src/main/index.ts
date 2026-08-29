import { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell, Tray } from 'electron'
import { join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { DeviceRegistry } from './hardware/registry'
import { ActionExecutor } from './actionExecutor'
import { TriggerResolver } from './triggerResolver'
import { getKdeCursorPosition } from './kdeCursor'
import { log } from './logger'
import { parseOrbitProfile } from './profile'
import { DEFAULT_SETTINGS } from '../shared/mxMaster4'
import type { ButtonBinding, DeviceSettings, DeviceSnapshot, HapticWaveform, OrbitProfile, ScanResult } from '../shared/device'
import type { CapturedControl } from './hardware/adapter'

let mainWindow: BrowserWindow | undefined
let ringWindow: BrowserWindow | undefined
let registry: DeviceRegistry
let scanTimer: NodeJS.Timeout | undefined
let tray: Tray | undefined
let scanInFlight: Promise<ScanResult> | undefined
let activeDeviceId: string | undefined
let activeSettings: DeviceSettings = DEFAULT_SETTINGS
let lastDeviceSignature = ''
let quitting = false
const actionExecutor = new ActionExecutor()
const triggerResolver = new TriggerResolver((binding, trigger) => {
  void executeAction(binding.actionId, `${binding.controlId}:${trigger}`)
})
const hasSingleInstanceLock = app.requestSingleInstanceLock()
const startInBackground = process.argv.includes('--background')

app.setName('Orbit')

if (!hasSingleInstanceLock) app.quit()
app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
})

if (/^\d{2,5}$/.test(process.env.ORBIT_DEBUG_PORT ?? '')) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.ORBIT_DEBUG_PORT)
}

function rendererUrl(hash = ''): string {
  return process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}${hash}`
    : `file://${join(__dirname, '../renderer/index.html')}${hash}`
}

function createWindow(showOnReady = true): void {
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.min(1320, Math.max(960, workArea.width - 64))
  const height = Math.min(820, Math.max(660, workArea.height - 64))
  const window = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(960, workArea.width),
    minHeight: Math.min(660, workArea.height),
    center: true,
    show: false,
    frame: false,
    backgroundColor: '#f2f2ef',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  mainWindow = window
  window.once('ready-to-show', () => {
    if (showOnReady) window.show()
  })
  window.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
    log('main_window_hidden')
  })
  window.on('closed', () => { mainWindow = undefined })
  window.webContents.on('render-process-gone', (_event, details) => log('main_renderer_gone', { reason: details.reason, exitCode: details.exitCode }))
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  void window.loadURL(rendererUrl())
}

function createRingWindow(): BrowserWindow {
  if (ringWindow && !ringWindow.isDestroyed()) return ringWindow
  const { workArea } = screen.getPrimaryDisplay()
  const window = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  ringWindow = window
  window.setAlwaysOnTop(true, 'pop-up-menu')
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  window.on('show', () => log('ring_window_shown'))
  window.on('hide', () => log('ring_window_hidden'))
  window.on('closed', () => { ringWindow = undefined; log('ring_window_closed') })
  window.webContents.on('render-process-gone', (_event, details) => log('ring_renderer_gone', { reason: details.reason, exitCode: details.exitCode }))
  void window.loadURL(rendererUrl('#ring'))
  return window
}

function createTray(): void {
  if (tray) return
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'orbit.png')
    : join(app.getAppPath(), 'resources', 'orbit.png')
  tray = new Tray(iconPath)
  tray.setToolTip('Orbit')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Orbit', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]))
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

function showActionRing(): void {
  const window = createRingWindow()
  const cursorScriptPath = app.isPackaged
    ? join(process.resourcesPath, 'kwin-cursor-position.js')
    : join(app.getAppPath(), 'resources', 'kwin-cursor-position.js')
  const kdeCursor = getKdeCursorPosition(cursorScriptPath)
  const cursor = kdeCursor ?? screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const radius = 145
  const reveal = (): void => {
    // KDE Wayland can retain a transparent window's original backing surface
    // when it is changed to fullscreen. Size it to the compositor work area
    // directly so the ring cannot be clipped to the old 800x600 surface.
    window.setFullScreen(false)
    window.setBounds(display.workArea, false)
    const actualBounds = window.getBounds()
    const x = cursor.x - actualBounds.x
    const y = cursor.y - actualBounds.y
    // Position the renderer while the transparent surface is still hidden.
    // This prevents the first frame from flashing at its fallback center.
    window.webContents.send('orbit:ring-position', {
      x: Math.round(x),
      y: Math.round(y),
      trusted: Boolean(kdeCursor)
    })
    window.show()
    window.setAlwaysOnTop(true, 'pop-up-menu')
    window.moveTop()
    log('ring_window_bounds', {
      target: display.workArea,
      actual: actualBounds,
      content: window.getContentBounds()
    })
    log('action_ring_opened', {
      cursorX: cursor.x,
      cursorY: cursor.y,
      ringX: Math.round(x + actualBounds.x),
      ringY: Math.round(y + actualBounds.y),
      cursorSource: kdeCursor ? 'kwin' : 'electron',
      scaleFactor: display.scaleFactor
    })
  }
  if (window.webContents.isLoading()) window.webContents.once('did-finish-load', reveal)
  else reveal()
}

function bindingsForControl(controlId: CapturedControl['controlId']): ButtonBinding[] {
  return activeSettings.bindings.filter((binding) => binding.controlId === controlId)
}

async function playHaptic(waveform: HapticWaveform): Promise<void> {
  if (!activeDeviceId || !activeSettings.hapticsEnabled) return
  await registry.playHaptic(activeDeviceId, waveform, activeSettings.hapticIntensity)
}

async function executeAction(actionId: string, source: string): Promise<void> {
  if (actionId === 'action-ring') {
    showActionRing()
    return
  }
  const customAction = activeSettings.customActions.find((action) => action.id === actionId)
  const result = await actionExecutor.execute(actionId, customAction)
  log('action_executed', { actionId, source, ok: result.ok, message: result.message })
  if (result.ok) {
    try { await playHaptic('damp-state-change') } catch (error) {
      log('haptic_after_action_failed', { error: String(error) })
    }
  }
}

function profileFilename(device: DeviceSnapshot): string {
  const base = `${device.name}-profile`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base || 'orbit-profile'}.orbit.json`
}

async function openLocalPath(path: string): Promise<{ ok: boolean; message?: string }> {
  const message = await shell.openPath(path)
  return message ? { ok: false, message } : { ok: true }
}

function handleCapturedControl(control: CapturedControl): void {
  const bindings = bindingsForControl(control.controlId)
  log('control_event', {
    controlId: control.controlId,
    cid: `0x${control.cid.toString(16)}`,
    phase: control.phase,
    bindings: bindings.map((binding) => ({
      actionId: binding.actionId,
      trigger: binding.trigger ?? 'press'
    }))
  })
  triggerResolver.handle(control, bindings)
}

async function persistSettings(deviceId: string, settings: DeviceSettings): Promise<void> {
  const directory = join(app.getPath('userData'), 'devices')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, `${deviceId}.json`), JSON.stringify(settings, null, 2), 'utf8')
}

async function loadSettings(deviceId: string): Promise<DeviceSettings | undefined> {
  try {
    const raw = await readFile(join(app.getPath('userData'), 'devices', `${deviceId}.json`), 'utf8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as DeviceSettings
  } catch {
    if (deviceId !== 'mx-master-4') return undefined
    try {
      const legacy = await readFile(join(app.getPath('userData'), 'devices', 'mx-master-4-bolt.json'), 'utf8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(legacy) } as DeviceSettings
    } catch {
      return undefined
    }
  }
}

async function performDeviceScan(broadcast = false): Promise<ScanResult> {
  const devices = await registry.discover()
  const result = { devices, scannedAt: new Date().toISOString() }
  const signature = devices.map((device) => `${device.id}:${device.access}`).join('|')
  const first = devices[0]

  if (first && activeDeviceId !== first.id) {
    activeDeviceId = first.id
    activeSettings = (await loadSettings(first.id)) ?? activeSettings
    try {
      await registry.saveSettings(first.id, activeSettings)
      log('input_capture_started', { deviceId: first.id, access: first.access })
    } catch (error) {
      log('input_capture_failed', { deviceId: first.id, error: String(error) })
    }
  } else if (!first) {
    activeDeviceId = undefined
  }

  if (signature !== lastDeviceSignature) {
    log('device_state_changed', { signature: signature || 'offline' })
    lastDeviceSignature = signature
    broadcast = true
  }
  if (broadcast) mainWindow?.webContents.send('orbit:devices-changed', result)
  return result
}

function scanDevices(broadcast = false): Promise<ScanResult> {
  if (scanInFlight) return scanInFlight
  scanInFlight = performDeviceScan(broadcast).finally(() => { scanInFlight = undefined })
  return scanInFlight
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  registry = new DeviceRegistry(handleCapturedControl)

  ipcMain.handle('orbit:scan', () => scanDevices())
  ipcMain.handle('orbit:save-settings', async (_event, deviceId: string, settings: DeviceSettings) => {
    triggerResolver.reset()
    activeSettings = settings
    await persistSettings(deviceId, settings)
    if (activeDeviceId !== deviceId) {
      log('settings_saved_offline', { deviceId })
      return { ok: true as const }
    }
    try {
      await registry.saveSettings(deviceId, settings)
      log('settings_applied', { deviceId })
      return { ok: true as const }
    } catch (error) {
      log('settings_apply_failed', { deviceId, error: String(error) })
      throw error
    }
  })
  ipcMain.handle('orbit:play-haptic', async (_event, deviceId: string, waveform: HapticWaveform, intensity: number) => {
    try {
      await registry.playHaptic(deviceId, waveform, Math.max(0, Math.min(100, intensity)))
      log('haptic_played', { deviceId, waveform, intensity })
      return { ok: true }
    } catch (error) {
      log('haptic_failed', { deviceId, waveform, error: String(error) })
      return { ok: false, message: error instanceof Error ? error.message : 'Haptic test failed.' }
    }
  })
  ipcMain.handle('orbit:run-device-command', async (_event, deviceId: string, commandId: string, settings: DeviceSettings) => {
    try {
      await registry.runCommand(deviceId, commandId, settings)
      log('device_command_executed', { deviceId, commandId, ok: true })
      return { ok: true }
    } catch (error) {
      log('device_command_executed', { deviceId, commandId, ok: false, error: String(error) })
      return { ok: false, message: error instanceof Error ? error.message : 'Device command failed.' }
    }
  })
  ipcMain.handle('orbit:export-profile', async (_event, device: DeviceSnapshot, settings: DeviceSettings) => {
    const options = {
      title: 'Export Orbit profile',
      defaultPath: join(app.getPath('documents'), profileFilename(device)),
      filters: [{ name: 'Orbit profile', extensions: ['json'] }]
    }
    const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { ok: false, message: 'Export cancelled.' }
    const profile: OrbitProfile = {
      format: 'orbit-profile', version: 1, name: `${device.name} profile`, deviceModel: device.model,
      exportedAt: new Date().toISOString(), settings
    }
    await writeFile(result.filePath, JSON.stringify(profile, null, 2), 'utf8')
    return { ok: true, path: result.filePath }
  })
  ipcMain.handle('orbit:import-profile', async () => {
    const options = {
      title: 'Import Orbit profile', properties: ['openFile'],
      filters: [{ name: 'Orbit profile', extensions: ['json'] }]
    } satisfies Electron.OpenDialogOptions
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return { ok: false, message: 'Import cancelled.' }
    try {
      const profile = parseOrbitProfile(await readFile(result.filePaths[0], 'utf8'))
      return { ok: true, profile }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Profile import failed.' }
    }
  })
  ipcMain.handle('orbit:list-drivers', () => registry.listDrivers())
  ipcMain.handle('orbit:open-driver-docs', () => {
    const path = app.isPackaged
      ? join(process.resourcesPath, 'docs', 'community-drivers.md')
      : join(app.getAppPath(), 'docs', 'community-drivers.md')
    return openLocalPath(path)
  })
  ipcMain.handle('orbit:open-driver-folder', async () => {
    const path = app.isPackaged
      ? join(app.getPath('userData'), 'community-drivers')
      : join(app.getAppPath(), 'src', 'main', 'community-drivers')
    await mkdir(path, { recursive: true })
    return openLocalPath(path)
  })
  ipcMain.handle('orbit:test-ring', () => {
    showActionRing()
    return { ok: true }
  })
  ipcMain.handle('orbit:platform', () => process.platform)
  ipcMain.on('orbit:window-minimize', () => mainWindow?.minimize())
  ipcMain.on('orbit:window-close', () => mainWindow?.close())
  ipcMain.on('orbit:ring-hover', () => { void playHaptic('subtle-collision').catch((error) => log('ring_hover_haptic_failed', { error: String(error) })) })
  ipcMain.on('orbit:ring-select', (_event, actionId: string) => {
    ringWindow?.hide()
    void executeAction(actionId, 'action-ring')
  })
  ipcMain.on('orbit:ring-close', (_event, reason?: string) => {
    log('action_ring_close_requested', { reason: reason ?? 'unspecified' })
    ringWindow?.hide()
  })

  const inputCheck = await actionExecutor.check()
  log('uinput_check', { ok: inputCheck.ok, message: inputCheck.message })
  createWindow(!startInBackground)
  createTray()
  await scanDevices()
  scanTimer = setInterval(() => { void scanDevices().catch((error) => log('device_scan_failed', { error: String(error) })) }, 10000)

  app.on('activate', () => {
    if (!mainWindow) createWindow()
    else mainWindow.show()
  })
})

app.on('before-quit', (event) => {
  log('before_quit', { quitting, hasRegistry: Boolean(registry) })
  if (quitting || !registry) return
  event.preventDefault()
  quitting = true
  if (scanTimer) clearInterval(scanTimer)
  actionExecutor.close()
  triggerResolver.reset()
  void registry.close().finally(() => app.quit())
})
app.on('will-quit', () => log('will_quit'))
