import type { ControlId } from '../../../shared/device'
import mouseImage from '../assets/orbit-ergonomic-mouse.svg'

interface MouseVisualProps {
  activeControl: ControlId
  onControlSelect: (control: ControlId) => void
  hapticPulse: boolean
}

const hotspots: Array<{ id: ControlId; x: number; y: number; label: string; n: number }> = [
  { id: 'middle', x: 21.0, y: 49.0, label: 'Middle button on the main scroll wheel', n: 1 },
  { id: 'mode-shift', x: 43.0, y: 31.2, label: 'Top button', n: 2 },
  { id: 'haptic-panel', x: 76.0, y: 60.0, label: 'Haptic Sense panel', n: 3 },
  { id: 'thumbwheel', x: 64.8, y: 31.8, label: 'Horizontal thumb wheel', n: 4 },
  { id: 'gesture', x: 56.0, y: 55.0, label: 'Gesture button', n: 5 },
  { id: 'forward', x: 61.5, y: 49.5, label: 'Forward', n: 6 },
  { id: 'back', x: 70.5, y: 39.5, label: 'Back', n: 7 }
]

export function MouseVisual({ activeControl, onControlSelect, hapticPulse }: MouseVisualProps): React.JSX.Element {
  return (
    <div className={`mouse-stage ${hapticPulse ? 'haptic-pulse' : ''}`}>
      <div className="mouse-aura" />
      <div className="mouse-ground-shadow" />
      <img className="mouse-product-image" src={mouseImage} alt="Orbit original ergonomic mouse control diagram" draggable={false} />

      {hotspots.map((spot) => (
        <button
          key={spot.id}
          className={`hotspot ${activeControl === spot.id ? 'active' : ''}`}
          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          onClick={() => onControlSelect(spot.id)}
          type="button"
          aria-label={spot.label}
        >
          {spot.n}
        </button>
      ))}
    </div>
  )
}
