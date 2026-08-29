import { DEFAULT_SETTINGS } from '../shared/mxMaster4'
import type { ButtonBinding, CustomActionDefinition, DeviceSettings, OrbitProfile } from '../shared/device'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBinding(value: unknown): value is ButtonBinding {
  if (!isRecord(value)) return false
  return typeof value.controlId === 'string' && typeof value.actionId === 'string' &&
    typeof value.label === 'string' && typeof value.detail === 'string' &&
    (value.trigger === undefined || value.trigger === 'press' || value.trigger === 'double-press' || value.trigger === 'long-press')
}

function isCustomAction(value: unknown): value is CustomActionDefinition {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.label !== 'string' || typeof value.detail !== 'string') return false
  if (value.type === 'shortcut') return typeof value.shortcut === 'string'
  return value.type === 'launch' && typeof value.executable === 'string' &&
    Array.isArray(value.args) && value.args.every((argument) => typeof argument === 'string')
}

function validatedSettings(value: unknown): DeviceSettings {
  if (!isRecord(value)) throw new Error('The profile does not contain valid device settings.')
  if (!Array.isArray(value.bindings) || !value.bindings.every(isBinding)) throw new Error('The profile contains invalid button bindings.')
  const customActions = value.customActions ?? []
  if (!Array.isArray(customActions) || !customActions.every(isCustomAction)) throw new Error('The profile contains invalid custom actions.')
  if (value.driver !== undefined && !isRecord(value.driver)) throw new Error('The profile contains invalid driver settings.')

  return {
    ...DEFAULT_SETTINGS,
    ...value,
    driver: isRecord(value.driver) ? value.driver as DeviceSettings['driver'] : {},
    customActions,
    bindings: value.bindings
  } as DeviceSettings
}

export function parseOrbitProfile(raw: string): OrbitProfile {
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value) || value.format !== 'orbit-profile' || value.version !== 1) {
    throw new Error('This is not a supported Orbit profile.')
  }
  if (typeof value.name !== 'string' || typeof value.deviceModel !== 'string' || typeof value.exportedAt !== 'string') {
    throw new Error('The profile metadata is incomplete.')
  }
  return {
    format: 'orbit-profile',
    version: 1,
    name: value.name,
    deviceModel: value.deviceModel,
    exportedAt: value.exportedAt,
    settings: validatedSettings(value.settings)
  }
}
