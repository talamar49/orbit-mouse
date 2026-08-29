import type { ActionTrigger, ButtonBinding, ControlId } from '../shared/device'
import type { CapturedControl } from './hardware/adapter'

const DOUBLE_PRESS_WINDOW_MS = 300
const LONG_PRESS_DELAY_MS = 450

interface ControlState {
  lastDownAt: number
  longPressTimer?: NodeJS.Timeout
  singlePressTimer?: NodeJS.Timeout
  longPressFired: boolean
  doublePressFired: boolean
}

export class TriggerResolver {
  private readonly controls = new Map<ControlId, ControlState>()

  constructor(private readonly execute: (binding: ButtonBinding, trigger: ActionTrigger) => void) {}

  handle(control: CapturedControl, bindings: readonly ButtonBinding[]): void {
    const state = this.controls.get(control.controlId) ?? {
      lastDownAt: 0,
      longPressFired: false,
      doublePressFired: false
    }
    this.controls.set(control.controlId, state)

    const press = bindings.find((binding) => (binding.trigger ?? 'press') === 'press')
    const doublePress = bindings.find((binding) => binding.trigger === 'double-press')
    const longPress = bindings.find((binding) => binding.trigger === 'long-press')

    if (control.phase === 'up') {
      if (state.longPressTimer) clearTimeout(state.longPressTimer)
      state.longPressTimer = undefined
      if (state.longPressFired || state.doublePressFired) {
        state.lastDownAt = 0
        state.longPressFired = false
        state.doublePressFired = false
        return
      }
      if (press) {
        if (doublePress) {
          if (state.singlePressTimer) clearTimeout(state.singlePressTimer)
          const remaining = Math.max(0, DOUBLE_PRESS_WINDOW_MS - (Date.now() - state.lastDownAt))
          state.singlePressTimer = setTimeout(() => {
            state.singlePressTimer = undefined
            state.lastDownAt = 0
            this.execute(press, 'press')
          }, remaining)
        } else if (longPress) {
          this.execute(press, 'press')
          state.lastDownAt = 0
        }
      }
      return
    }

    if (!bindings.length) return
    state.longPressFired = false
    state.doublePressFired = false

    const now = Date.now()
    if (doublePress && state.lastDownAt > 0 && now - state.lastDownAt <= DOUBLE_PRESS_WINDOW_MS) {
      if (state.singlePressTimer) clearTimeout(state.singlePressTimer)
      state.singlePressTimer = undefined
      state.doublePressFired = true
      state.lastDownAt = 0
      this.execute(doublePress, 'double-press')
    } else {
      state.lastDownAt = now
      if (longPress) {
        if (state.longPressTimer) clearTimeout(state.longPressTimer)
        state.longPressTimer = setTimeout(() => {
          state.longPressTimer = undefined
          state.longPressFired = true
          state.lastDownAt = 0
          this.execute(longPress, 'long-press')
        }, LONG_PRESS_DELAY_MS)
      } else if (press && !doublePress) {
        this.execute(press, 'press')
        state.lastDownAt = 0
      }
    }
  }

  reset(): void {
    for (const state of this.controls.values()) {
      if (state.longPressTimer) clearTimeout(state.longPressTimer)
      if (state.singlePressTimer) clearTimeout(state.singlePressTimer)
    }
    this.controls.clear()
  }
}
