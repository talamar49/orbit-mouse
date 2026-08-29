import { BookOpen, FolderCode, Keyboard, Mouse, PackageCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DeviceSnapshot, DriverInfo } from '../../../shared/device'

interface DevicesPageProps {
  device: DeviceSnapshot
  onNotice: (message: string) => void
}

const browserDrivers: DriverInfo[] = [{
  id: 'logitech-hidpp', name: 'Logitech HID++', source: 'core', deviceKinds: ['mouse'], supportedModels: ['MX Master 4']
}]

export function DevicesPage({ device, onNotice }: DevicesPageProps): React.JSX.Element {
  const [drivers, setDrivers] = useState<DriverInfo[]>(browserDrivers)

  useEffect(() => {
    if (!window.orbit) return
    void window.orbit.listDrivers().then(setDrivers).catch(() => onNotice('Could not read installed drivers.'))
  }, [onNotice])

  const open = async (target: 'docs' | 'folder'): Promise<void> => {
    if (!window.orbit) {
      onNotice('Driver development links are available in the desktop app.')
      return
    }
    const result = target === 'docs' ? await window.orbit.openDriverDocs() : await window.orbit.openDriverFolder()
    if (!result.ok) onNotice(result.message ?? 'Could not open that location.')
  }

  return (
    <div className="settings-page library-page">
      <header className="page-heading"><div><span className="eyebrow">HARDWARE PLATFORM</span><h1>Devices & extensions</h1><p>Orbit discovers peripherals through small, capability-based drivers.</p></div></header>

      <section className="connected-device-card">
        <span className="device-kind-icon">{device.kind === 'keyboard' ? <Keyboard size={24} /> : <Mouse size={24} />}</span>
        <span><small>CONNECTED DEVICE</small><strong>{device.name}</strong><em>{device.connection === 'bluetooth' ? 'Bluetooth' : device.connection === 'bolt' ? 'Logi Bolt' : device.connection}</em></span>
        <i className={device.access === 'ready' ? 'ready' : ''}>{device.access === 'ready' ? 'READY' : device.access.toUpperCase()}</i>
      </section>

      <section className="library-section">
        <div className="section-heading"><div><h2>Installed drivers</h2><p>Each driver defines its controls, telemetry, and device-specific settings.</p></div></div>
        <div className="driver-grid">
          {drivers.map((driver) => (
            <article className="driver-card" key={driver.id}>
              <div><span className="library-icon"><PackageCheck size={18} /></span><i>{driver.source.toUpperCase()}</i></div>
              <h3>{driver.name}</h3>
              <p>{driver.supportedModels.join(', ') || 'Models are discovered dynamically'}</p>
              <footer>{driver.deviceKinds.map((kind) => <span key={kind}>{kind === 'mouse' ? <Mouse size={13} /> : <Keyboard size={13} />}{kind}</span>)}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="extension-callout">
        <div><span className="eyebrow">COMMUNITY DRIVER API · V1</span><h2>Add another mouse or keyboard</h2><p>Implement discovery, raw control events, and only the settings your device actually supports. Drivers are reviewed source modules registered at build time so hardware access stays auditable.</p></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => void open('folder')} type="button"><FolderCode size={15} /> Open driver folder</button>
          <button className="primary-button" onClick={() => void open('docs')} type="button"><BookOpen size={15} /> Developer guide</button>
        </div>
      </section>
    </div>
  )
}
