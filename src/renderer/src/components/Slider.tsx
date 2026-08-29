interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 0, max = 100, step = 1, suffix = '%', onChange }: SliderProps): React.JSX.Element {
  const progress = ((value - min) / (max - min)) * 100
  return (
    <label className="slider-field">
      <span className="setting-label"><span>{label}</span><strong>{value}{suffix}</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
