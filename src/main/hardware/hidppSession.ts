import { EventEmitter } from 'node:events'
import { HID } from 'node-hid'
import type { ControlId, DeviceSettings, HapticWaveform } from '../../shared/device'
import type { CapturedControl } from './adapter'

const SHORT_REPORT_ID = 0x10
const LONG_REPORT_ID = 0x11
const REPROG_CONTROLS_FEATURE = 0x1b04
const HAPTIC_FEATURE = 0x19b0
const DEVICE_NAME_FEATURE = 0x0005
const UNIFIED_BATTERY_FEATURE = 0x1004
const LEGACY_BATTERY_FEATURE = 0x1000

const CONTROL_CANDIDATES: Partial<Record<ControlId, number[]>> = {
  middle: [0x0052],
  back: [0x0053, 0x00bd, 0x00ce, 0x00db],
  forward: [0x0056, 0x00cf],
  gesture: [0x00c3],
  'haptic-panel': [0x01a0],
  'mode-shift': [0x00c4, 0x00ed, 0x00fd],
  thumbwheel: []
}

const NATIVE_ACTIONS: Partial<Record<ControlId, string>> = {
  middle: 'middle-click',
  back: 'back',
  forward: 'forward',
  'mode-shift': 'wheel-mode',
  thumbwheel: 'horizontal-scroll'
}

interface PendingRequest {
  deviceIndex: number
  featureIndex: number
  functionAndSoftware: number
  resolve: (data: number[]) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

interface FeatureRoute {
  deviceIndex: number
  featureIndex: number
}

interface ControlInfo {
  cid: number
  divertable: boolean
}

interface ReportingState {
  cid: number
  diverted: boolean
  rawXy: boolean
}

export class HidppSession extends EventEmitter {
  private readonly handle: HID
  private softwareId = 1
  private pending = new Set<PendingRequest>()
  private reprogRoute?: FeatureRoute
  private hapticRoute?: FeatureRoute
  private diverted = new Map<number, ReportingState>()
  private cidControls = new Map<number, ControlId>()
  private held = new Set<number>()
  private closed = false
  deviceName?: string

  constructor(
    path: string,
    private readonly direct = false,
    private readonly longOnly = false
  ) {
    super()
    this.handle = new HID(path)
    this.handle.on('data', (data: Buffer) => this.onData([...data]))
    this.handle.on('error', (error: Error) => this.emit('transport-error', error))
  }

  private nextSoftwareId(): number {
    const id = this.softwareId
    this.softwareId = id >= 15 ? 1 : id + 1
    return id
  }

  private onData(data: number[]): void {
    if (data.length < 4) return

    for (const request of this.pending) {
      const responseMatches =
        data[1] === request.deviceIndex &&
        data[2] === request.featureIndex &&
        data[3] === request.functionAndSoftware
      const errorMatches =
        data[1] === request.deviceIndex &&
        data[2] === 0xff &&
        data[3] === request.featureIndex &&
        data[4] === request.functionAndSoftware
      if (!responseMatches && !errorMatches) continue

      clearTimeout(request.timer)
      this.pending.delete(request)
      if (errorMatches) request.reject(new Error(`HID++ feature error ${data[5] ?? 'unknown'}.`))
      else request.resolve(data)
      return
    }

    const route = this.reprogRoute
    const softwareId = data[3] & 0x0f
    const functionId = data[3] >> 4
    if (!route || data[1] !== route.deviceIndex || data[2] !== route.featureIndex || softwareId !== 0) return
    if (functionId !== 0) return

    const pressed = new Set<number>()
    for (let offset = 4; offset <= 10 && offset + 1 < data.length; offset += 2) {
      const cid = (data[offset] << 8) | data[offset + 1]
      if (cid) pressed.add(cid)
    }
    for (const cid of pressed) {
      if (!this.held.has(cid)) {
        const controlId = this.cidControls.get(cid)
        if (controlId) this.emit('control', { controlId, cid, phase: 'down' } satisfies CapturedControl)
      }
    }
    for (const cid of this.held) {
      if (!pressed.has(cid)) {
        const controlId = this.cidControls.get(cid)
        if (controlId) this.emit('control', { controlId, cid, phase: 'up' } satisfies CapturedControl)
      }
    }
    this.held = pressed
  }

  private call(
    route: FeatureRoute,
    functionId: number,
    args: number[],
    reportId: typeof SHORT_REPORT_ID | typeof LONG_REPORT_ID = SHORT_REPORT_ID,
    timeoutMs = 900
  ): Promise<number[]> {
    if (this.closed) return Promise.reject(new Error('HID++ session is closed.'))
    const softwareId = this.nextSoftwareId()
    const functionAndSoftware = ((functionId & 0x0f) << 4) | softwareId
    const effectiveReportId = this.longOnly && reportId === SHORT_REPORT_ID ? LONG_REPORT_ID : reportId
    const reportLength = effectiveReportId === SHORT_REPORT_ID ? 7 : 20
    const request = new Array<number>(reportLength).fill(0)
    request[0] = effectiveReportId
    request[1] = route.deviceIndex
    request[2] = route.featureIndex
    request[3] = functionAndSoftware
    args.slice(0, reportLength - 4).forEach((value, index) => { request[4 + index] = value })

    return new Promise<number[]>((resolve, reject) => {
      const pending: PendingRequest = {
        deviceIndex: route.deviceIndex,
        featureIndex: route.featureIndex,
        functionAndSoftware,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.pending.delete(pending)
          reject(new Error('HID++ request timed out.'))
        }, timeoutMs)
      }
      this.pending.add(pending)
      try {
        this.handle.write(request)
      } catch (error) {
        clearTimeout(pending.timer)
        this.pending.delete(pending)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  private async resolveFeature(featureId: number): Promise<FeatureRoute> {
    const args = [(featureId >> 8) & 0xff, featureId & 0xff, 0]
    const deviceIndices = this.direct ? [0xff] : [1, 2, 3, 4, 5, 6]
    for (const deviceIndex of deviceIndices) {
      try {
        const response = await this.call({ deviceIndex, featureIndex: 0 }, 0, args, SHORT_REPORT_ID, 360)
        if (response[4]) return { deviceIndex, featureIndex: response[4] }
      } catch {
        // Empty receiver slots and HID++ 1.0 devices do not expose the feature.
      }
    }
    throw new Error(`No connected device exposes HID++ feature 0x${featureId.toString(16)}.`)
  }

  private async resolveFeatureOnDevice(deviceIndex: number, featureId: number): Promise<FeatureRoute> {
    const response = await this.call(
      { deviceIndex, featureIndex: 0 },
      0,
      [(featureId >> 8) & 0xff, featureId & 0xff, 0],
      SHORT_REPORT_ID,
      420
    )
    if (!response[4]) throw new Error(`Device does not expose HID++ feature 0x${featureId.toString(16)}.`)
    return { deviceIndex, featureIndex: response[4] }
  }

  async probeMxMaster4(): Promise<boolean> {
    try {
      const deviceIndex = this.reprogRoute?.deviceIndex ?? this.hapticRoute?.deviceIndex
      if (deviceIndex) {
        this.reprogRoute = await this.resolveFeatureOnDevice(deviceIndex, REPROG_CONTROLS_FEATURE)
        this.hapticRoute = await this.resolveFeatureOnDevice(deviceIndex, HAPTIC_FEATURE)
      } else {
        this.reprogRoute = await this.resolveFeature(REPROG_CONTROLS_FEATURE)
        this.hapticRoute = await this.resolveFeatureOnDevice(this.reprogRoute.deviceIndex, HAPTIC_FEATURE)
      }
      if (this.reprogRoute.deviceIndex !== this.hapticRoute.deviceIndex) return false
      this.deviceName ??= await this.readDeviceName(this.reprogRoute.deviceIndex)
      return /\bMX\s+Master\s+4\b/i.test(this.deviceName)
    } catch {
      return false
    }
  }

  private async readDeviceName(deviceIndex: number): Promise<string> {
    const route = await this.resolveFeatureOnDevice(deviceIndex, DEVICE_NAME_FEATURE)
    const countResponse = await this.call(route, 0, [0, 0, 0])
    const count = countResponse[4]
    const bytes: number[] = []
    while (bytes.length < count) {
      const response = await this.call(route, 1, [bytes.length, 0, 0])
      bytes.push(...response.slice(4).filter((byte) => byte !== 0))
    }
    return Buffer.from(bytes.slice(0, count)).toString('utf8').trim()
  }

  async readBattery(): Promise<number | null> {
    const deviceIndex = this.reprogRoute?.deviceIndex ?? this.hapticRoute?.deviceIndex
    if (!deviceIndex) return null
    try {
      const route = await this.resolveFeatureOnDevice(deviceIndex, UNIFIED_BATTERY_FEATURE)
      const response = await this.call(route, 1, [0, 0, 0])
      const percentage = response[4]
      if (percentage > 0 && percentage <= 100) return percentage
      return ({ 1: 5, 2: 20, 4: 70, 8: 100 } as Record<number, number>)[response[5]] ?? null
    } catch {
      try {
        const route = await this.resolveFeatureOnDevice(deviceIndex, LEGACY_BATTERY_FEATURE)
        const response = await this.call(route, 0, [0, 0, 0])
        return response[4] <= 100 ? response[4] : null
      } catch {
        return null
      }
    }
  }

  private async enumerateControls(route: FeatureRoute): Promise<ControlInfo[]> {
    const countResponse = await this.call(route, 0, [0, 0, 0])
    const count = countResponse[4]
    const controls: ControlInfo[] = []
    for (let index = 0; index < count; index += 1) {
      const response = await this.call(route, 1, [index], LONG_REPORT_ID)
      const cid = (response[4] << 8) | response[5]
      controls.push({ cid, divertable: (response[8] & (1 << 5)) !== 0 })
    }
    return controls
  }

  private async getReporting(route: FeatureRoute, cid: number): Promise<ReportingState> {
    const response = await this.call(route, 2, [(cid >> 8) & 0xff, cid & 0xff, 0])
    return {
      cid,
      diverted: (response[6] & 1) !== 0,
      rawXy: (response[6] & (1 << 4)) !== 0
    }
  }

  private async setReporting(route: FeatureRoute, state: ReportingState): Promise<void> {
    const flags = (1 << 1) | Number(state.diverted) | (1 << 5) | (Number(state.rawXy) << 4)
    await this.call(route, 3, [(state.cid >> 8) & 0xff, state.cid & 0xff, flags], LONG_REPORT_ID)
  }

  async configure(settings: DeviceSettings): Promise<void> {
    const route = this.reprogRoute ?? await this.resolveFeature(REPROG_CONTROLS_FEATURE)
    this.reprogRoute = route
    const controls = await this.enumerateControls(route)
    const available = new Set(controls.filter((control) => control.divertable).map((control) => control.cid))
    const desired = new Map<number, ControlId>()

    for (const binding of settings.bindings) {
      if (NATIVE_ACTIONS[binding.controlId] === binding.actionId && (binding.trigger ?? 'press') === 'press') continue
      const cid = CONTROL_CANDIDATES[binding.controlId]?.find((candidate) => available.has(candidate))
      if (cid) desired.set(cid, binding.controlId)
    }

    try {
      for (const [cid, original] of [...this.diverted]) {
        if (desired.has(cid)) continue
        await this.setReporting(route, original)
        this.diverted.delete(cid)
        this.cidControls.delete(cid)
      }

      for (const [cid, controlId] of desired) {
        if (!this.diverted.has(cid)) {
          const original = await this.getReporting(route, cid)
          this.diverted.set(cid, original)
          await this.setReporting(route, { cid, diverted: true, rawXy: false })
        }
        this.cidControls.set(cid, controlId)
      }
    } catch (error) {
      await this.restoreReporting()
      throw error
    }
  }

  async playHaptic(waveform: HapticWaveform, intensity: number): Promise<void> {
    this.hapticRoute ??= await this.resolveFeature(HAPTIC_FEATURE)
    const safeIntensity = Math.max(0, Math.min(100, Math.round(intensity)))
    await this.call(this.hapticRoute, 2, [1, safeIntensity, 0])
    await this.call(this.hapticRoute, 4, [waveform === 'damp-state-change' ? 1 : 4, 0, 0])
  }

  async close(): Promise<void> {
    if (this.closed) return
    await this.restoreReporting()
    this.closed = true
    for (const request of this.pending) {
      clearTimeout(request.timer)
      request.reject(new Error('HID++ session closed.'))
    }
    this.pending.clear()
    this.handle.close()
  }

  private async restoreReporting(): Promise<void> {
    if (this.reprogRoute) {
      for (const original of this.diverted.values()) {
        try { await this.setReporting(this.reprogRoute, original) } catch { /* device may be gone */ }
      }
    }
    this.diverted.clear()
    this.cidControls.clear()
    this.held.clear()
  }
}
