import { Bluetooth, Mouse, Radio } from 'lucide-react'
import { BrandMark } from './BrandMark'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
  deviceOnline: boolean
}

export function Sidebar({ active, onNavigate, deviceOnline }: SidebarProps): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <BrandMark />
        <span>Orbit</span>
      </div>

      <p className="sidebar-label">Devices</p>
      <nav className="device-nav" aria-label="Devices">
        <button className={`device-nav-item ${active === 'mouse' ? 'active' : ''}`} onClick={() => onNavigate('mouse')} type="button">
          <span className="device-icon"><Mouse size={19} strokeWidth={1.8} /></span>
          <span>MX Master 4</span>
          <i className={`online-dot ${deviceOnline ? '' : 'offline'}`} />
        </button>
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-status">
        <div className="receiver-orb">{deviceOnline ? <Radio size={15} /> : <Bluetooth size={15} />}</div>
        <div>
          <strong>{deviceOnline ? 'Connected' : 'Unavailable'}</strong>
          <span>{deviceOnline ? 'HID++ hardware link' : 'Mouse not detected'}</span>
        </div>
      </div>
    </aside>
  )
}
