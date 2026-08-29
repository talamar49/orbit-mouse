import { BatteryMedium, CircleAlert, Minus, RotateCw, X } from 'lucide-react'
import type { DeviceSnapshot } from '../../../shared/device'
import { BrandMark } from './BrandMark'

interface TopBarProps {
  device: DeviceSnapshot
  scanning: boolean
  onScan: () => void
}

export function TopBar({ device, scanning, onScan }: TopBarProps): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="topbar-identity">
        <div className="compact-brand"><BrandMark /><span>Orbit</span></div>
        <i className="topbar-divider" />
        <div>
          <div className="device-title-button"><span>{device.name}</span></div>
          <small>{device.kind === 'keyboard' ? 'Keyboard settings' : 'Device settings'}</small>
        </div>
      </div>
      <div className="topbar-actions">
        {device.access === 'restricted' && (
          <span className="access-badge"><CircleAlert size={15} /> Limited access</span>
        )}
        {device.access === 'offline' && (
          <span className="access-badge offline"><CircleAlert size={15} /> Device offline</span>
        )}
        {device.access === 'ready' && <span className="sync-state"><i /> {device.connection === 'bluetooth' ? 'Bluetooth' : 'Logi Bolt'}</span>}
        <span className="battery-state"><BatteryMedium size={18} /> {device.battery === null ? 'Unavailable' : `${device.battery}%`}</span>
        <button className={`icon-button ${scanning ? 'spinning' : ''}`} onClick={onScan} type="button" aria-label="Scan devices">
          <RotateCw size={17} />
        </button>
        <span className="window-controls">
          <button onClick={() => window.orbit?.minimizeWindow()} type="button" aria-label="Minimize"><Minus size={15} /></button>
          <button onClick={() => window.orbit?.closeWindow()} type="button" aria-label="Close and keep Orbit running"><X size={15} /></button>
        </span>
      </div>
    </header>
  )
}
