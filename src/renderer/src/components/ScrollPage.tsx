import { Gauge, MousePointer2, RotateCcw } from 'lucide-react'
import type { DeviceSettings } from '../../../shared/device'
import { Slider } from './Slider'
import { Toggle } from './Toggle'

interface ScrollPageProps {
  settings: DeviceSettings
  update: <K extends keyof DeviceSettings>(key: K, value: DeviceSettings[K]) => void
}

export function ScrollPage({ settings, update }: ScrollPageProps): React.JSX.Element {
  return (
    <div className="settings-page">
      <div className="settings-hero lilac">
        <span className="hero-icon"><MousePointer2 size={28} /></span>
        <div><span className="eyebrow">POINTER & SCROLLING</span><h1>Make every movement feel right.</h1><p>Tune precision, wheel behavior, and the thumb wheel independently.</p></div>
      </div>
      <div className="settings-grid">
        <section className="settings-card wide">
          <div className="card-heading"><div><span className="card-icon purple"><Gauge size={20} /></span><h3>Pointer precision</h3></div><button className="tiny-button" type="button"><RotateCcw size={14} /> Reset</button></div>
          <Slider label="Tracking speed" value={settings.pointerSpeed} onChange={(value) => update('pointerSpeed', value)} />
          <Slider label="Sensor resolution" value={settings.dpi} min={200} max={8000} step={50} suffix=" DPI" onChange={(value) => update('dpi', value)} />
          <div className="preset-row">
            {[800, 1000, 1600, 3200].map((dpi) => <button key={dpi} className={settings.dpi === dpi ? 'active' : ''} onClick={() => update('dpi', dpi)} type="button">{dpi}</button>)}
          </div>
        </section>
        <section className="settings-card">
          <div className="card-heading"><div><span className="card-icon lime">↕</span><h3>MagSpeed wheel</h3></div></div>
          <Toggle checked={settings.smartShift} onChange={(value) => update('smartShift', value)} label="SmartShift" description="Automatically enter free-spin" />
          <Slider label="Shift sensitivity" value={settings.smartShiftThreshold} onChange={(value) => update('smartShiftThreshold', value)} />
          <Slider label="Ratchet force" value={settings.scrollForce} onChange={(value) => update('scrollForce', value)} />
          <Toggle checked={settings.naturalScroll} onChange={(value) => update('naturalScroll', value)} label="Natural direction" />
        </section>
        <section className="settings-card">
          <div className="card-heading"><div><span className="card-icon blue">↔</span><h3>Thumb wheel</h3></div></div>
          <Slider label="Horizontal speed" value={settings.thumbWheelSpeed} onChange={(value) => update('thumbWheelSpeed', value)} />
          <div className="segmented-control">
            <button className={settings.thumbWheelDirection === 'standard' ? 'active' : ''} onClick={() => update('thumbWheelDirection', 'standard')} type="button">Standard</button>
            <button className={settings.thumbWheelDirection === 'inverted' ? 'active' : ''} onClick={() => update('thumbWheelDirection', 'inverted')} type="button">Inverted</button>
          </div>
        </section>
      </div>
    </div>
  )
}
