import { contextBridge, ipcRenderer } from 'electron'
import type { DeviceSettings, HapticWaveform, OrbitBridge, RingPosition, ScanResult } from '../shared/device'

let latestRingPosition: RingPosition | undefined
const ringPositionCallbacks = new Set<(position: RingPosition) => void>()
ipcRenderer.on('orbit:ring-position', (_event, position: RingPosition) => {
  latestRingPosition = position
  for (const callback of ringPositionCallbacks) callback(position)
})

const bridge: OrbitBridge = {
  scanDevices: () => ipcRenderer.invoke('orbit:scan'),
  saveSettings: (deviceId: string, settings: DeviceSettings) =>
    ipcRenderer.invoke('orbit:save-settings', deviceId, settings),
  playHaptic: (deviceId: string, waveform: HapticWaveform, intensity: number) =>
    ipcRenderer.invoke('orbit:play-haptic', deviceId, waveform, intensity),
  runDeviceCommand: (deviceId: string, commandId: string, settings: DeviceSettings) =>
    ipcRenderer.invoke('orbit:run-device-command', deviceId, commandId, settings),
  exportProfile: (device, settings) => ipcRenderer.invoke('orbit:export-profile', device, settings),
  importProfile: () => ipcRenderer.invoke('orbit:import-profile'),
  listDrivers: () => ipcRenderer.invoke('orbit:list-drivers'),
  openDriverDocs: () => ipcRenderer.invoke('orbit:open-driver-docs'),
  openDriverFolder: () => ipcRenderer.invoke('orbit:open-driver-folder'),
  listDeviceManifests: () => ipcRenderer.invoke('orbit:list-device-manifests'),
  saveDeviceManifest: (manifest) => ipcRenderer.invoke('orbit:save-device-manifest', manifest),
  deleteDeviceManifest: (manifestId) => ipcRenderer.invoke('orbit:delete-device-manifest', manifestId),
  exportDeviceManifest: (manifest) => ipcRenderer.invoke('orbit:export-device-manifest', manifest),
  minimizeWindow: () => ipcRenderer.send('orbit:window-minimize'),
  closeWindow: () => ipcRenderer.send('orbit:window-close'),
  getPlatform: () => ipcRenderer.invoke('orbit:platform'),
  testActionRing: () => ipcRenderer.invoke('orbit:test-ring'),
  ringHover: (index: number) => ipcRenderer.send('orbit:ring-hover', index),
  ringSelect: (actionId: string) => ipcRenderer.send('orbit:ring-select', actionId),
  ringClose: (reason?: string) => ipcRenderer.send('orbit:ring-close', reason),
  onRingPosition: (callback: (position: RingPosition) => void) => {
    ringPositionCallbacks.add(callback)
    if (latestRingPosition) callback(latestRingPosition)
    return () => ringPositionCallbacks.delete(callback)
  },
  onDevicesChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, result: unknown): void => callback(result as ScanResult)
    ipcRenderer.on('orbit:devices-changed', listener)
    return () => ipcRenderer.removeListener('orbit:devices-changed', listener)
  }
}

contextBridge.exposeInMainWorld('orbit', bridge)
