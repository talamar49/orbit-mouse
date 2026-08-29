import { Blocks, ChevronRight, CircleAlert, Files, MousePointer2, SlidersHorizontal, Vibrate } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActionTrigger, ButtonBinding, ControlId, CustomActionDefinition, DeviceSettings, DeviceSnapshot, ScanResult, SettingValue } from '../../shared/device'
import { DEFAULT_SETTINGS, MX_MASTER_4_CAPABILITIES, MX_MASTER_4_SETTINGS_SECTIONS } from '../../shared/mxMaster4'
import { ActionPicker } from './components/ActionPicker'
import { ButtonPanel } from './components/ButtonPanel'
import { DeviceSettingsPage } from './components/DeviceSettingsPage'
import { DevicesPage } from './components/DevicesPage'
import { MouseVisual } from './components/MouseVisual'
import { ProfilesPage } from './components/ProfilesPage'
import { TopBar } from './components/TopBar'

const browserDevice: DeviceSnapshot = {
  id: 'mx-master-4',
  adapterId: 'logitech-hidpp',
  vendor: 'Logitech',
  name: 'MX Master 4',
  model: 'MX Master 4',
  kind: 'mouse',
  connection: 'bolt',
  access: 'restricted',
  accessMessage: 'Bolt receiver found, but Linux HID permissions are restricted. Configuration is saved locally until access is granted.',
  battery: 86,
  capabilities: MX_MASTER_4_CAPABILITIES,
  actions: [],
  settingsSections: MX_MASTER_4_SETTINGS_SECTIONS
}

const offlineDevice: DeviceSnapshot = {
  ...browserDevice,
  access: 'offline',
  battery: null,
  accessMessage: 'The Logi Bolt receiver and MX Master 4 are not currently visible to Orbit.'
}

const SETTINGS_STORAGE_KEY = 'orbit:settings:v1:mx-master-4'

const sectionIcons = { buttons: MousePointer2, haptics: Vibrate, settings: SlidersHorizontal }
const globalPages = new Set(['profiles', 'devices'])

function ButtonsPage({
  settings,
  activeControl,
  onControlSelect,
  onEdit,
  hapticPulse
}: {
  settings: DeviceSettings
  activeControl: ControlId
  onControlSelect: (control: ControlId) => void
  onEdit: (trigger: ActionTrigger) => void
  hapticPulse: boolean
}): React.JSX.Element {
  const bindings = settings.bindings.filter((candidate) => candidate.controlId === activeControl)
  return (
    <div className="button-page">
      <section className="device-canvas">
        <div className="canvas-copy">
          <h1>Configure controls</h1>
          <p>Select a marker on the mouse to change its action.</p>
        </div>
        <MouseVisual activeControl={activeControl} onControlSelect={onControlSelect} hapticPulse={hapticPulse} />
      </section>
      <ButtonPanel controlId={activeControl} bindings={bindings} customActions={settings.customActions} onEdit={onEdit} />
    </div>
  )
}

export default function App(): React.JSX.Element {
  const [device, setDevice] = useState<DeviceSnapshot>(() => window.orbit ? offlineDevice : { ...browserDevice, access: 'demo' })
  const [settings, setSettings] = useState<DeviceSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [page, setPage] = useState('assignments')
  const [activeControl, setActiveControl] = useState<ControlId>('haptic-panel')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTrigger, setPickerTrigger] = useState<ActionTrigger>('press')
  const [scanning, setScanning] = useState(false)
  const [runningCommand, setRunningCommand] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const isFirstSave = useRef(true)
  const didInitialScan = useRef(false)

  const scan = useCallback(async () => {
    setScanning(true)
    try {
      const result: ScanResult = window.orbit
        ? await window.orbit.scanDevices()
        : { devices: [browserDevice], scannedAt: new Date().toISOString() }
      if (result.devices[0]) {
        setDevice(result.devices[0])
      } else {
        setDevice(window.orbit ? offlineDevice : { ...browserDevice, access: 'demo' })
        setToast('MX Master 4 is offline. Reconnect the Bolt receiver or Bluetooth device.')
      }
    } catch {
      setToast('Device scan failed. Your saved configuration is still available.')
    } finally {
      window.setTimeout(() => setScanning(false), 450)
    }
  }, [])

  useEffect(() => {
    if (didInitialScan.current) return
    didInitialScan.current = true
    void scan()
  }, [scan])

  useEffect(() => {
    if (!window.orbit) return
    return window.orbit.onDevicesChanged((result) => {
      const next = result.devices[0]
      setDevice(next ?? offlineDevice)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    if (isFirstSave.current) {
      isFirstSave.current = false
      return
    }
    const timer = window.setTimeout(async () => {
      if (window.orbit && device.access === 'ready') {
        try {
          await window.orbit.saveSettings(device.id, settings)
        } catch (error) {
          setToast(error instanceof Error ? error.message : 'Could not apply the button configuration.')
        }
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [device.access, device.id, settings])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const firstSection = device.settingsSections[0]
    if (!globalPages.has(page) && !device.settingsSections.some((section) => section.id === page) && firstSection) setPage(firstSection.id)
    if (device.settingDefaults) {
      setSettings((current) => ({
        ...current,
        driver: { ...device.settingDefaults, ...current.driver }
      }))
    }
  }, [device.id, device.settingDefaults, device.settingsSections, page])

  const readSetting = useCallback((key: string): SettingValue => {
    const coreValue = (settings as unknown as Record<string, unknown>)[key]
    if (typeof coreValue === 'boolean' || typeof coreValue === 'number' || typeof coreValue === 'string') return coreValue
    return settings.driver[key] ?? device.settingDefaults?.[key] ?? false
  }, [device.settingDefaults, settings])

  const updateSetting = useCallback((key: string, value: SettingValue) => {
    setSettings((current) => {
      const coreValue = (current as unknown as Record<string, unknown>)[key]
      if (typeof coreValue === 'boolean' || typeof coreValue === 'number' || typeof coreValue === 'string') {
        return { ...current, [key]: value } as DeviceSettings
      }
      return { ...current, driver: { ...current.driver, [key]: value } }
    })
  }, [])

  const currentBinding = settings.bindings.find((binding) =>
    binding.controlId === activeControl && (binding.trigger ?? 'press') === pickerTrigger
  )

  const selectAction = (binding: ButtonBinding): void => {
    setSettings((current) => ({
      ...current,
      bindings: [
        ...current.bindings.filter((candidate) =>
          candidate.controlId !== binding.controlId || (candidate.trigger ?? 'press') !== (binding.trigger ?? 'press')
        ),
        binding
      ]
    }))
    setPickerOpen(false)
    setToast(`${binding.label} assigned to ${binding.trigger?.replace('-', ' ') ?? 'press'}.`)
  }

  const createCustomAction = (action: CustomActionDefinition, binding: ButtonBinding): void => {
    setSettings((current) => ({
      ...current,
      customActions: [...current.customActions, action],
      bindings: [
        ...current.bindings.filter((candidate) =>
          candidate.controlId !== binding.controlId || (candidate.trigger ?? 'press') !== (binding.trigger ?? 'press')
        ),
        binding
      ]
    }))
    setPickerOpen(false)
    setToast(`${action.label} created and assigned.`)
  }

  const deleteCustomAction = (actionId: string): void => {
    const action = settings.customActions.find((candidate) => candidate.id === actionId)
    setSettings((current) => ({
      ...current,
      customActions: current.customActions.filter((candidate) => candidate.id !== actionId),
      bindings: current.bindings.filter((binding) => binding.actionId !== actionId)
    }))
    setToast(`${action?.label ?? 'Custom action'} deleted.`)
  }

  const updateCustomAction = (action: CustomActionDefinition): void => {
    setSettings((current) => ({
      ...current,
      customActions: current.customActions.map((candidate) => candidate.id === action.id ? action : candidate),
      bindings: current.bindings.map((binding) => binding.actionId === action.id
        ? { ...binding, label: action.label, detail: action.detail }
        : binding)
    }))
    setToast(`${action.label} updated.`)
  }

  const exportProfile = async (): Promise<void> => {
    if (!window.orbit) {
      setToast('Profile export requires the desktop app.')
      return
    }
    const result = await window.orbit.exportProfile(device, settings)
    setToast(result.ok ? `Profile exported to ${result.path}.` : result.message ?? 'Profile export failed.')
  }

  const importProfile = async (): Promise<void> => {
    if (!window.orbit) {
      setToast('Profile import requires the desktop app.')
      return
    }
    const result = await window.orbit.importProfile()
    if (!result.ok || !result.profile) {
      setToast(result.message ?? 'Profile import failed.')
      return
    }
    setSettings(result.profile.settings)
    setToast(`Imported “${result.profile.name}” for ${result.profile.deviceModel}.`)
  }

  const removeAction = (): void => {
    setSettings((current) => ({
      ...current,
      bindings: current.bindings.filter((binding) =>
        binding.controlId !== activeControl || (binding.trigger ?? 'press') !== pickerTrigger
      )
    }))
    setPickerOpen(false)
    setToast(`${pickerTrigger.replace('-', ' ')} removed.`)
  }

  const runDeviceCommand = async (commandId: string): Promise<void> => {
    setRunningCommand(commandId)
    const result = window.orbit
      ? await window.orbit.runDeviceCommand(device.id, commandId, settings)
      : { ok: false, message: 'Device commands require the desktop app.' }
    window.setTimeout(() => setRunningCommand(null), 350)
    setToast(result.ok ? 'Device command completed.' : result.message ?? 'Device command failed.')
  }

  return (
    <div className="app-shell">
      <main className="workspace">
        <TopBar device={device} scanning={scanning} onScan={() => void scan()} />
        <nav className="page-tabs" aria-label="Device settings">
          {device.settingsSections.map((section) => {
            const Icon = sectionIcons[section.icon]
            return (
            <button key={section.id} className={page === section.id ? 'active' : ''} onClick={() => setPage(section.id)} type="button"><Icon size={16} />{section.label}</button>
            )
          })}
          <span className="tab-spacer" />
          <button className={page === 'profiles' ? 'active' : ''} onClick={() => setPage('profiles')} type="button"><Files size={16} />Profiles</button>
          <button className={page === 'devices' ? 'active' : ''} onClick={() => setPage('devices')} type="button"><Blocks size={16} />Devices & extensions</button>
        </nav>

        <div className="page-content">
          {device.settingsSections.find((section) => section.id === page)?.kind === 'assignments' && (
            <ButtonsPage
              settings={settings}
              activeControl={activeControl}
              onControlSelect={setActiveControl}
              onEdit={(trigger) => {
                setPickerTrigger(trigger)
                setPickerOpen(true)
              }}
              hapticPulse={false}
            />
          )}
          {device.settingsSections.map((section) => section.id === page && section.kind === 'settings' ? (
            <DeviceSettingsPage
              key={section.id}
              device={device}
              section={section}
              readSetting={readSetting}
              updateSetting={updateSetting}
              runCommand={(commandId) => void runDeviceCommand(commandId)}
              runningCommand={runningCommand}
            />
          ) : null)}
          {page === 'profiles' && (
            <ProfilesPage
              device={device}
              settings={settings}
              onExport={() => void exportProfile()}
              onImport={() => void importProfile()}
              onUpdateCustomAction={updateCustomAction}
              onDeleteCustomAction={deleteCustomAction}
            />
          )}
          {page === 'devices' && <DevicesPage device={device} customActions={settings.customActions} onNotice={setToast} />}
        </div>
      </main>

      {pickerOpen && (
        <ActionPicker
          controlId={activeControl}
          trigger={pickerTrigger}
          currentBinding={currentBinding}
          customActions={settings.customActions}
          driverActions={device.actions}
          onSelect={selectAction}
          onCreate={createCustomAction}
          onUpdate={updateCustomAction}
          onRemove={removeAction}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {toast && <div className="toast"><CircleAlert size={17} /><span>{toast}</span><button onClick={() => setToast(null)} type="button"><ChevronRight size={16} /></button></div>}
    </div>
  )
}
