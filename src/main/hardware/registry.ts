import type { DeviceSettings, DeviceSnapshot, DriverInfo, HapticWaveform } from '../../shared/device'
import type { CapturedControl, DeviceAdapter } from './adapter'
import { LogitechHidppAdapter } from './logitech'
import { communityDrivers } from '../community-drivers'

export class DeviceRegistry {
  private readonly adapters: DeviceAdapter[]
  private deviceAdapters = new Map<string, DeviceAdapter>()

  constructor(onControl?: (control: CapturedControl) => void) {
    const emitControl = onControl ?? (() => undefined)
    this.adapters = [
      new LogitechHidppAdapter(emitControl),
      ...communityDrivers.map((driver) => driver.create({ emitControl }))
    ]
  }

  async discover(): Promise<DeviceSnapshot[]> {
    const results = await Promise.allSettled(this.adapters.map((adapter) => adapter.discover()))
    const devices = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    const nextDeviceAdapters = new Map<string, DeviceAdapter>()
    for (const device of devices) {
      const adapter = this.adapters.find((candidate) => candidate.id === device.adapterId)
      if (adapter) nextDeviceAdapters.set(device.id, adapter)
    }
    this.deviceAdapters = nextDeviceAdapters
    return devices
  }

  listDrivers(): DriverInfo[] {
    const communityIds = new Set(communityDrivers.map((driver) => driver.id))
    return this.adapters.map((adapter) => ({
      id: adapter.id,
      name: adapter.name ?? adapter.id,
      source: communityIds.has(adapter.id) ? 'community' : 'core',
      deviceKinds: [...(adapter.deviceKinds ?? ['mouse'])],
      supportedModels: [...(adapter.supportedModels ?? [])]
    }))
  }

  async saveSettings(deviceId: string, settings: DeviceSettings): Promise<void> {
    const adapter = this.deviceAdapters.get(deviceId)
    if (!adapter) throw new Error('Device is offline; settings were saved but cannot be applied yet.')
    await adapter.saveSettings(deviceId, settings)
  }

  async playHaptic(deviceId: string, waveform: HapticWaveform, intensity: number): Promise<void> {
    const adapter = this.deviceAdapters.get(deviceId)
    if (!adapter) throw new Error('Device adapter is not available. Scan for devices and try again.')
    if (!adapter.playHaptic) throw new Error('This mouse does not provide haptic feedback.')
    await adapter.playHaptic(deviceId, waveform, intensity)
  }

  async runCommand(deviceId: string, commandId: string, settings: DeviceSettings): Promise<void> {
    const adapter = this.deviceAdapters.get(deviceId)
    if (!adapter?.runCommand) throw new Error('This device driver does not provide that command.')
    await adapter.runCommand(deviceId, commandId, settings)
  }

  async close(): Promise<void> {
    await Promise.all(this.adapters.map((adapter) => adapter.close?.()))
  }
}
