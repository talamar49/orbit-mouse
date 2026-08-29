import { AppWindow, ArrowLeft, ArrowRight, Copy, Grid2X2, Search, ScreenShare } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RingPosition } from '../../../shared/device'

const ringActions = [
  { id: 'copy', label: 'Copy', icon: Copy },
  { id: 'screen-capture', label: 'Capture', icon: ScreenShare },
  { id: 'app-switcher', label: 'Switch apps', icon: AppWindow },
  { id: 'forward', label: 'Forward', icon: ArrowRight },
  { id: 'spotlight', label: 'Search', icon: Search },
  { id: 'back', label: 'Back', icon: ArrowLeft },
  { id: 'mission-control', label: 'Workspaces', icon: Grid2X2 },
  { id: 'paste', label: 'Paste', icon: Copy }
]

export function ActionRing(): React.JSX.Element {
  const [active, setActive] = useState<number | null>(null)
  const [position, setPosition] = useState<RingPosition | null>(null)
  const pointerResolved = useRef(false)
  const pendingPosition = useRef<RingPosition | null>(null)
  const fallbackTimer = useRef<number | null>(null)

  const applyPosition = (nextPosition: RingPosition): void => {
    const edge = 145
    setPosition({
      x: Math.max(edge, Math.min(nextPosition.x, window.innerWidth - edge)),
      y: Math.max(edge, Math.min(nextPosition.y, window.innerHeight - edge))
    })
  }

  useEffect(() => {
    const unsubscribe = window.orbit?.onRingPosition((nextPosition) => {
      setActive(null)
      setPosition(null)
      pendingPosition.current = nextPosition
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
      if (nextPosition.trusted) {
        pointerResolved.current = true
        applyPosition(nextPosition)
        return
      }
      pointerResolved.current = false
      fallbackTimer.current = window.setTimeout(() => {
        if (!pointerResolved.current && pendingPosition.current) applyPosition(pendingPosition.current)
      }, 100)
    })
    return () => {
      unsubscribe?.()
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
    }
  }, [])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') window.orbit?.ringClose('escape')
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const resolvePointerPosition = (event: React.PointerEvent<HTMLElement>): void => {
    if (pointerResolved.current) return
    pointerResolved.current = true
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
    applyPosition({ x: event.clientX, y: event.clientY })
  }

  const closeRing = (reason: string): void => {
    setPosition(null)
    window.orbit?.ringClose(reason)
  }

  return (
    <main
      className="ring-shell"
      onPointerEnter={resolvePointerPosition}
      onPointerMove={resolvePointerPosition}
      onPointerDown={(event) => {
        if (!position) return
        const distanceFromCenter = Math.hypot(event.clientX - position.x, event.clientY - position.y)
        if (distanceFromCenter > 145) closeRing('outside-click')
      }}
    >
      {position && <>
        <div className="ring-backdrop" style={{ left: position.x, top: position.y }} />
        <div className="action-ring-orbit" style={{ left: position.x, top: position.y }}>
        {ringActions.map(({ id, label, icon: Icon }, index) => {
          const angle = (index * 45 - 90) * (Math.PI / 180)
          const x = Math.cos(angle) * 102
          const y = Math.sin(angle) * 102
          return (
            <button
              key={id}
              className={`ring-action ${active === index ? 'active' : ''}`}
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              type="button"
              onMouseEnter={() => {
                setActive(index)
                window.orbit?.ringHover(index)
              }}
              onClick={() => {
                setPosition(null)
                window.orbit?.ringSelect(id)
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          )
        })}
        <div className="ring-center" aria-label="Actions Ring status">
          <span className="orbit-dot" />
          <strong>{active === null ? 'Orbit' : ringActions[active].label}</strong>
          <small>{active === null ? 'Choose' : 'Run action'}</small>
        </div>
        </div>
      </>}
    </main>
  )
}
