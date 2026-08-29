import { HID } from 'node-hid'

const SHORT_REPORT_ID = 0x10
const HAPTIC_FEATURE_ID = 0x19b0
const RESPONSE_TIMEOUT_MS = 500

interface FeatureRoute {
  deviceIndex: number
  featureIndex: number
}

export class HidppTransport {
  private softwareId = 1

  constructor(private readonly path: string) {}

  private nextSoftwareId(): number {
    const current = this.softwareId
    this.softwareId = current >= 15 ? 1 : current + 1
    return current
  }

  private call(
    handle: HID,
    deviceIndex: number,
    featureIndex: number,
    functionId: number,
    args: [number, number, number],
    timeout = RESPONSE_TIMEOUT_MS
  ): number[] {
    const softwareId = this.nextSoftwareId()
    const functionAndSoftware = ((functionId & 0x0f) << 4) | softwareId
    const request = [SHORT_REPORT_ID, deviceIndex, featureIndex, functionAndSoftware, ...args]
    handle.write(request)

    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const response = handle.readTimeout(Math.min(80, Math.max(1, deadline - Date.now())))
      if (response.length === 0 || response[1] !== deviceIndex) continue

      if (response[2] === featureIndex && response[3] === functionAndSoftware) return response

      const isHidpp20Error =
        response[2] === 0xff &&
        response[3] === featureIndex &&
        response[4] === functionAndSoftware
      if (isHidpp20Error) throw new Error(`HID++ feature error ${response[5] ?? 'unknown'}.`)
    }

    throw new Error('HID++ request timed out.')
  }

  private resolveFeature(handle: HID, featureId: number): FeatureRoute {
    const [featureHigh, featureLow] = [(featureId >> 8) & 0xff, featureId & 0xff]
    for (let deviceIndex = 1; deviceIndex <= 6; deviceIndex += 1) {
      try {
        const response = this.call(handle, deviceIndex, 0, 0, [featureHigh, featureLow, 0], 320)
        const featureIndex = response[4]
        if (featureIndex) return { deviceIndex, featureIndex }
      } catch {
        // Empty receiver slots and HID++ 1.0 devices cannot resolve this feature.
      }
    }
    throw new Error(`No connected device exposes HID++ feature 0x${featureId.toString(16)}.`)
  }

  playHaptic(waveform: 1 | 4, intensity: number): void {
    const handle = new HID(this.path)
    try {
      const route = this.resolveFeature(handle, HAPTIC_FEATURE_ID)
      const safeIntensity = Math.max(0, Math.min(100, Math.round(intensity)))
      this.call(handle, route.deviceIndex, route.featureIndex, 2, [1, safeIntensity, 0])
      this.call(handle, route.deviceIndex, route.featureIndex, 4, [waveform, 0, 0])
    } finally {
      handle.close()
    }
  }
}
