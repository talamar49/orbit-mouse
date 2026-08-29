import type { ControlId, DeviceKind, DeviceSettings, DeviceSnapshot, HapticWaveform } from '../../shared/device'

export interface CapturedControl {
  controlId: ControlId
  cid: number
  phase: 'down' | 'up'
}

export interface DeviceAdapter {
  readonly id: string
  readonly name?: string
  readonly deviceKinds?: readonly DeviceKind[]
  readonly supportedModels?: readonly string[]
  discover(): Promise<DeviceSnapshot[]>
  saveSettings(deviceId: string, settings: DeviceSettings): Promise<void>
  playHaptic?(deviceId: string, waveform: HapticWaveform, intensity: number): Promise<void>
  runCommand?(deviceId: string, commandId: string, settings: DeviceSettings): Promise<void>
  close?(): Promise<void>
}
