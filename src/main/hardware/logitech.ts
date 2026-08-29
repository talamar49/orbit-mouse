import { devicesAsync, type Device } from 'node-hid'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import type { DeviceSettings, DeviceSnapshot, HapticWaveform } from '../../shared/device'
import { MX_MASTER_4_CAPABILITIES, MX_MASTER_4_SETTINGS_SECTIONS } from '../../shared/mxMaster4'
import type { CapturedControl, DeviceAdapter } from './adapter'
import { HidppSession } from './hidppSession'

const LOGITECH_VENDOR_ID = 0x046d
const BOLT_RECEIVER_IDS = new Set([0xc548, 0xc547])

interface EndpointCandidate {
  device: Device
  connection: 'bolt' | 'bluetooth'
  direct: boolean
  longOnly: boolean
}

async function canWrite(path?: string): Promise<boolean> {
  if (!path) return false
  try {
    await access(path, constants.R_OK | constants.W_OK)
    return true
  } catch {
    return false
  }
}

export class LogitechHidppAdapter implements DeviceAdapter {
  readonly id = 'logitech-hidpp'
  readonly name = 'Logitech HID++'
  readonly deviceKinds = ['mouse'] as const
  readonly supportedModels = ['Logitech MX Master 4'] as const
  private featurePath?: string
  private session?: HidppSession
  private verified = false
  private missedProbes = 0
  private connection?: 'bolt' | 'bluetooth'
  private battery: number | null = null

  constructor(private readonly onControl?: (control: CapturedControl) => void) {}

  private openSession(path: string, direct: boolean, longOnly: boolean): HidppSession {
    const session = new HidppSession(path, direct, longOnly)
    session.on('control', (control: CapturedControl) => this.onControl?.(control))
    session.on('transport-error', () => {
      if (this.session !== session) return
      this.session = undefined
      this.verified = false
      this.missedProbes = 0
      void session.close().catch(() => undefined)
    })
    return session
  }

  async discover(): Promise<DeviceSnapshot[]> {
    const hidDevices = await devicesAsync()
    const logitech = hidDevices.filter((device) => device.vendorId === LOGITECH_VENDOR_ID)
    const candidatePaths = new Set<string>()
    const candidates: EndpointCandidate[] = []
    for (const device of logitech) {
      if (!device.path || candidatePaths.has(device.path)) continue
      if (BOLT_RECEIVER_IDS.has(device.productId) && device.usagePage === 0xff00) {
        candidatePaths.add(device.path)
        candidates.push({ device, connection: 'bolt', direct: false, longOnly: false })
        continue
      }
      const isBleHidpp = device.usagePage === 0xff43 && device.usage === 0x0202
      const isClassicHidpp = device.usagePage === 0xff00 && device.usage === 0x0002
      if (!isBleHidpp && !isClassicHidpp) continue
      candidatePaths.add(device.path)
      candidates.push({ device, connection: 'bluetooth', direct: true, longOnly: isBleHidpp })
    }

    const activeCandidate = candidates.find((candidate) => candidate.device.path === this.featurePath)
    if (this.session && activeCandidate) {
      if (await this.session.probeMxMaster4()) {
        this.verified = true
        this.missedProbes = 0
        const level = await this.session.readBattery()
        if (level !== null) this.battery = level
        return [this.snapshot()]
      }
      this.missedProbes += 1
      if (this.verified && this.missedProbes < 3) return [this.snapshot()]
      await this.close()
    }

    // Probe Bluetooth-direct before a receiver. A receiver can remain plugged
    // in while the mouse is switched to a Bluetooth Easy-Switch channel.
    candidates.sort((left, right) => Number(right.direct) - Number(left.direct))
    for (const candidate of candidates) {
      if (!candidate.device.path || !(await canWrite(candidate.device.path))) continue
      this.featurePath = candidate.device.path
      this.connection = candidate.connection
      this.session = this.openSession(candidate.device.path, candidate.direct, candidate.longOnly)
      if (await this.session.probeMxMaster4()) {
        this.verified = true
        this.missedProbes = 0
        this.battery = await this.session.readBattery()
        return [this.snapshot()]
      }
      await this.close()
    }
    return []
  }

  private snapshot(): DeviceSnapshot {
    const connection = this.connection ?? 'bolt'
    return {
      id: 'mx-master-4',
        adapterId: this.id,
        vendor: 'Logitech',
        name: 'MX Master 4',
        model: 'MX Master 4',
        kind: 'mouse',
        connection,
        access: 'ready',
        accessMessage: `Verified as ${this.session?.deviceName ?? 'MX Master 4'} through HID++ device identity, controls, and haptics.`,
        battery: this.battery,
        capabilities: MX_MASTER_4_CAPABILITIES,
        settingsSections: MX_MASTER_4_SETTINGS_SECTIONS
    }
  }

  async saveSettings(_deviceId: string, settings: DeviceSettings): Promise<void> {
    if (!this.featurePath || !(await canWrite(this.featurePath))) {
      throw new Error('The Logitech HID++ endpoint is not writable.')
    }
    if (!this.session) {
      throw new Error('The verified mouse session is no longer active. Scan again.')
    }
    await this.session.configure(settings)
  }

  async playHaptic(_deviceId: string, _waveform: HapticWaveform, _intensity: number): Promise<void> {
    if (!this.featurePath) throw new Error('The Logitech HID++ feature endpoint is not available.')
    if (!(await canWrite(this.featurePath))) {
      throw new Error('Orbit can see the Logitech device, but cannot write to its HID++ endpoint.')
    }

    if (!this.session) throw new Error('The verified mouse session is no longer active. Scan again.')
    await this.session.playHaptic(_waveform, _intensity)
  }

  async runCommand(deviceId: string, commandId: string, settings: DeviceSettings): Promise<void> {
    if (commandId === 'haptic.soft-boundary') {
      await this.playHaptic(deviceId, 'subtle-collision', settings.hapticIntensity)
      return
    }
    if (commandId === 'haptic.firm-confirmation') {
      await this.playHaptic(deviceId, 'damp-state-change', settings.hapticIntensity)
      return
    }
    throw new Error(`Unsupported MX Master 4 command: ${commandId}`)
  }

  async close(): Promise<void> {
    await this.session?.close()
    this.session = undefined
    this.featurePath = undefined
    this.connection = undefined
    this.battery = null
    this.verified = false
    this.missedProbes = 0
  }
}
