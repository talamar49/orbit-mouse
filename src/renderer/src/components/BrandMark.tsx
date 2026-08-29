import orbitIcon from '../assets/orbit-app-icon.png'

export function BrandMark(): React.JSX.Element {
  return (
    <div className="brand-mark" aria-label="Orbit">
      <img src={orbitIcon} alt="" aria-hidden="true" />
    </div>
  )
}
