import type { ControlId } from '../../../shared/device'
import mouseImage from '../assets/mx-master-4-space-black.png'

interface MouseVisualProps {
  activeControl: ControlId
  onControlSelect: (control: ControlId) => void
  hapticPulse: boolean
}

const hotspots: Array<{ id: ControlId; x: number; y: number; label: string; n: number }> = [
  { id: 'middle', x: 21.0, y: 49.0, label: 'Middle button on the main scroll wheel', n: 1 },
  { id: 'mode-shift', x: 43.0, y: 31.2, label: 'Top button', n: 2 },
  { id: 'haptic-panel', x: 76.0, y: 60.0, label: 'Haptic Sense panel', n: 3 },
  { id: 'thumbwheel', x: 69.0, y: 32.5, label: 'Horizontal thumb wheel', n: 4 },
  { id: 'gesture', x: 56.0, y: 55.0, label: 'Gesture button', n: 5 },
  { id: 'forward', x: 65.0, y: 47.4, label: 'Forward', n: 6 },
  { id: 'back', x: 72.0, y: 41.8, label: 'Back', n: 7 }
]

export function MouseVisual({ activeControl, onControlSelect, hapticPulse }: MouseVisualProps): React.JSX.Element {
  return (
    <div className={`mouse-stage ${hapticPulse ? 'haptic-pulse' : ''}`}>
      <div className="mouse-aura" />
      <div className="mouse-ground-shadow" />
      <img className="mouse-product-image" src={mouseImage} alt="Logitech MX Master 4 for Mac in Space Black" draggable={false} />

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
