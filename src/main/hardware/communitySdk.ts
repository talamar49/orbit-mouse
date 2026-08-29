import type { DeviceKind } from '../../shared/device'
import type { CapturedControl, DeviceAdapter } from './adapter'

export const ORBIT_DRIVER_API_VERSION = 1 as const

export interface CommunityDriverContext {
  emitControl(control: CapturedControl): void
}

export interface CommunityDriver {
  readonly apiVersion: typeof ORBIT_DRIVER_API_VERSION
  readonly id: string
  readonly name: string
  readonly supportedModels: readonly string[]
  readonly deviceKinds: readonly DeviceKind[]
  create(context: CommunityDriverContext): DeviceAdapter
}

export function defineCommunityDriver(driver: CommunityDriver): CommunityDriver {
  return driver
}
