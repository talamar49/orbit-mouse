export type ConnectionKind = 'bolt' | 'bluetooth' | 'usb' | 'demo'
export type AccessState = 'ready' | 'restricted' | 'offline' | 'demo'
export type DeviceKind = 'mouse' | 'keyboard'
export type CapabilityId = string

export type KnownControlId =
  | 'middle'
  | 'mode-shift'
  | 'back'
  | 'forward'
  | 'gesture'
  | 'haptic-panel'
  | 'thumbwheel'

export type ControlId = KnownControlId | (string & {})

export type ActionTrigger = 'press' | 'double-press' | 'long-press'

export interface DeviceCapability {
  id: CapabilityId
  label: string
  writable: boolean
}

export type SettingValue = boolean | number | string

export type DeviceSettingField =
  | { type: 'toggle'; key: string; label: string; description?: string }
  | { type: 'range'; key: string; label: string; min: number; max: number; step: number; suffix?: string }

export interface DeviceCommandDefinition {
  id: string
  label: string
  description: string
}

export interface DeviceSettingsSection {
  id: string
  label: string
  icon: 'buttons' | 'haptics' | 'settings'
  kind: 'assignments' | 'settings'
  title: string
  description: string
  fields?: DeviceSettingField[]
  commands?: DeviceCommandDefinition[]
}

export interface DeviceSnapshot {
  id: string
  adapterId: string
  vendor: string
  name: string
  model: string
  kind: DeviceKind
  connection: ConnectionKind
  access: AccessState
  accessMessage?: string
  battery: number | null
  firmware?: string
  capabilities: DeviceCapability[]
  settingsSections: DeviceSettingsSection[]
  settingDefaults?: Record<string, SettingValue>
}

export interface ButtonBinding {
  controlId: ControlId
  actionId: string
  label: string
  detail: string
  trigger?: ActionTrigger
}

export type CustomActionDefinition =
  | {
      id: string
      label: string
      detail: string
      type: 'shortcut'
      shortcut: string
    }
  | {
      id: string
      label: string
      detail: string
      type: 'launch'
      executable: string
      args: string[]
    }

export interface DeviceSettings {
  dpi: number
  pointerSpeed: number
  naturalScroll: boolean
  smartShift: boolean
  smartShiftThreshold: number
  scrollForce: number
  thumbWheelSpeed: number
  thumbWheelDirection: 'standard' | 'inverted'
  hapticsEnabled: boolean
  hapticIntensity: number
  batterySaver: boolean
  driver: Record<string, SettingValue>
  customActions: CustomActionDefinition[]
  bindings: ButtonBinding[]
}

export interface OrbitProfile {
  format: 'orbit-profile'
  version: 1
  name: string
  deviceModel: string
  exportedAt: string
  settings: DeviceSettings
}

export interface DriverInfo {
  id: string
  name: string
  source: 'core' | 'community'
  deviceKinds: DeviceKind[]
  supportedModels: string[]
}

export interface ScanResult {
  devices: DeviceSnapshot[]
  scannedAt: string
}

export type HapticWaveform = 'subtle-collision' | 'damp-state-change'

export interface RingPosition {
  x: number
  y: number
  trusted?: boolean
}

export interface OrbitBridge {
  scanDevices(): Promise<ScanResult>
  saveSettings(deviceId: string, settings: DeviceSettings): Promise<{ ok: true }>
  playHaptic(deviceId: string, waveform: HapticWaveform, intensity: number): Promise<{ ok: boolean; message?: string }>
  runDeviceCommand(deviceId: string, commandId: string, settings: DeviceSettings): Promise<{ ok: boolean; message?: string }>
  exportProfile(device: DeviceSnapshot, settings: DeviceSettings): Promise<{ ok: boolean; path?: string; message?: string }>
  importProfile(): Promise<{ ok: boolean; profile?: OrbitProfile; message?: string }>
  listDrivers(): Promise<DriverInfo[]>
  openDriverDocs(): Promise<{ ok: boolean; message?: string }>
  openDriverFolder(): Promise<{ ok: boolean; message?: string }>
  minimizeWindow(): void
  closeWindow(): void
  getPlatform(): Promise<NodeJS.Platform>
  testActionRing(): Promise<{ ok: boolean; message?: string }>
  ringHover(index: number): void
  ringSelect(actionId: string): void
  ringClose(reason?: string): void
  onRingPosition(callback: (position: RingPosition) => void): () => void
  onDevicesChanged(callback: (result: ScanResult) => void): () => void
}
