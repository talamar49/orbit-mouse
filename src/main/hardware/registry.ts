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
    const devices = results.flatMap((result, index) => result.status === 'fulfilled'
      ? result.value.map((device) => ({ ...device, actions: [...(device.actions ?? []), ...(this.adapters[index].actionDefinitions ?? [])] }))
      : [])
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
      supportedModels: [...(adapter.supportedModels ?? [])],
      contributedActions: [...(adapter.actionDefinitions ?? [])]
    }))
  }

  isDriverAction(deviceId: string, actionId: string): boolean {
    return Boolean(this.deviceAdapters.get(deviceId)?.actionDefinitions?.some((action) => action.id === actionId))
  }

  async runAction(deviceId: string, actionId: string): Promise<void> {
    const adapter = this.deviceAdapters.get(deviceId)
    if (!adapter?.actionDefinitions?.some((action) => action.id === actionId) || !adapter.runAction) {
      throw new Error('This device driver does not provide that action.')
    }
    await adapter.runAction(deviceId, actionId)
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
