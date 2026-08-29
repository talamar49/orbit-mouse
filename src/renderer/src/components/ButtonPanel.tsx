import { ChevronRight, MousePointer2, Plus } from 'lucide-react'
import type { ActionTrigger, ButtonBinding, ControlId, CustomActionDefinition } from '../../../shared/device'
import { findActionOption } from '../data/actions'

const controlNames: Partial<Record<ControlId, string>> = {
  middle: 'Middle button',
  'mode-shift': 'Mode shift button',
  back: 'Back button',
  forward: 'Forward button',
  gesture: 'Gesture button',
  'haptic-panel': 'Haptic Sense panel',
  thumbwheel: 'Thumb wheel'
}

interface ButtonPanelProps {
  controlId: ControlId
  bindings: readonly ButtonBinding[]
  customActions: readonly CustomActionDefinition[]
  onEdit: (trigger: ActionTrigger) => void
}

const triggerOptions: Array<{ id: ActionTrigger; label: string; detail: string }> = [
  { id: 'press', label: 'Press', detail: 'Immediate or after tap detection' },
  { id: 'double-press', label: 'Double press', detail: 'Two presses within 300 ms' },
  { id: 'long-press', label: 'Long press', detail: 'Hold for 450 ms' }
]

export function ButtonPanel({ controlId, bindings, customActions, onEdit }: ButtonPanelProps): React.JSX.Element {
  const supportsTimedTriggers = controlId !== 'thumbwheel' && controlId !== 'mode-shift'
  const availableTriggers = supportsTimedTriggers ? triggerOptions : triggerOptions.slice(0, 1)

  return (
    <aside className="control-panel">
      <div className="panel-step">Selected control</div>
      <div className="control-heading">
        <span className="control-number"><MousePointer2 size={18} /></span>
        <div><h2>{controlNames[controlId] ?? controlId.replaceAll('-', ' ')}</h2><p>System-wide assignments</p></div>
      </div>

      <div className="trigger-assignment-list">
        {availableTriggers.map((trigger) => {
          const binding = bindings.find((candidate) => (candidate.trigger ?? 'press') === trigger.id)
          const action = binding ? findActionOption(binding.actionId, customActions) : undefined
          const Icon = action?.icon ?? Plus
          return (
            <button key={trigger.id} className={`assignment-card ${binding ? '' : 'unassigned'}`} onClick={() => onEdit(trigger.id)} type="button">
              <span className="assignment-icon"><Icon size={19} /></span>
              <span><small>{trigger.label}</small><strong>{binding?.label ?? 'Add action'}</strong><em>{binding?.detail ?? trigger.detail}</em></span>
              <ChevronRight size={17} />
            </button>
          )
        })}
      </div>
    </aside>
  )
}
