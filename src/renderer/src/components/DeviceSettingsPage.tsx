import { CircleAlert, Play, SlidersHorizontal } from 'lucide-react'
import type { DeviceSettingsSection, DeviceSnapshot, SettingValue } from '../../../shared/device'
import { Slider } from './Slider'
import { Toggle } from './Toggle'

interface DeviceSettingsPageProps {
  device: DeviceSnapshot
  section: DeviceSettingsSection
  readSetting: (key: string) => SettingValue
  updateSetting: (key: string, value: SettingValue) => void
  runCommand: (commandId: string) => void
  runningCommand: string | null
}

export function DeviceSettingsPage({
  device,
  section,
  readSetting,
  updateSetting,
  runCommand,
  runningCommand
}: DeviceSettingsPageProps): React.JSX.Element {
  return (
    <div className="settings-page">
      <div className="settings-hero">
        <div><h1>{section.title}</h1><p>{section.description}</p></div>
      </div>

      {device.access !== 'ready' && (
        <div className="permission-banner">
          <CircleAlert size={18} />
          <p><strong>Device unavailable</strong><span>{device.accessMessage}</span></p>
        </div>
      )}

      <div className="settings-grid device-settings-grid">
        {section.fields && section.fields.length > 0 && (
          <section className="settings-card">
            <div className="card-heading">
              <div><span className="card-icon"><SlidersHorizontal size={18} /></span><h3>Settings</h3></div>
            </div>
            <div className="driver-fields">
              {section.fields.map((field) => {
                const value = readSetting(field.key)
                if (field.type === 'toggle') {
                  return (
                    <Toggle
                      key={field.key}
                      checked={Boolean(value)}
                      onChange={(checked) => updateSetting(field.key, checked)}
                      label={field.label}
                      description={field.description}
                    />
                  )
                }
                return (
                  <Slider
                    key={field.key}
                    label={field.label}
                    value={typeof value === 'number' ? value : field.min}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    suffix={field.suffix ?? ''}
                    onChange={(next) => updateSetting(field.key, next)}
                  />
                )
              })}
            </div>
          </section>
        )}

        {section.commands && section.commands.length > 0 && (
          <section className="settings-card">
            <div className="card-heading"><div><span className="card-icon"><Play size={18} /></span><h3>Test device</h3></div></div>
            <div className="device-command-list">
              {section.commands.map((command) => (
                <button
                  key={command.id}
                  disabled={device.access !== 'ready' || runningCommand !== null}
                  onClick={() => runCommand(command.id)}
                  type="button"
                >
                  <span><strong>{command.label}</strong><small>{command.description}</small></span>
                  <Play size={14} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
