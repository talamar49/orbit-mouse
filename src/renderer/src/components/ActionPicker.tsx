import { Check, ChevronLeft, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { ActionTrigger, ButtonBinding, ControlId, CustomActionDefinition } from '../../../shared/device'
import { actions, customActionOption } from '../data/actions'
import { CustomActionForm } from './CustomActionForm'

interface ActionPickerProps {
  controlId: ControlId
  trigger: ActionTrigger
  currentBinding?: ButtonBinding
  customActions: readonly CustomActionDefinition[]
  onSelect: (binding: ButtonBinding) => void
  onCreate: (action: CustomActionDefinition, binding: ButtonBinding) => void
  onRemove: () => void
  onClose: () => void
}

const triggerNames: Record<ActionTrigger, string> = {
  press: 'Press',
  'double-press': 'Double press',
  'long-press': 'Long press'
}

export function ActionPicker({ controlId, trigger, currentBinding, customActions, onSelect, onCreate, onRemove, onClose }: ActionPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const normalized = query.trim().toLowerCase()
  const options = [...actions, ...customActions.map(customActionOption)]
  const compatible = options.filter((action) => {
    if (controlId === 'thumbwheel') return action.id === 'horizontal-scroll'
    if (action.id === 'horizontal-scroll') return false
    return action.id !== 'wheel-mode' || controlId === 'mode-shift'
  })
  const filtered = normalized
    ? compatible.filter((action) => `${action.label} ${action.detail} ${action.category}`.toLowerCase().includes(normalized))
    : compatible

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="action-picker" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label={creating ? 'Create custom action' : 'Choose an action'}>
        <div className="picker-header">
          <div>
            {creating && <button className="back-button" onClick={() => setCreating(false)} type="button"><ChevronLeft size={15} /> Actions</button>}
            <span className="eyebrow">{triggerNames[trigger].toUpperCase()}</span>
            <h2>{creating ? 'New custom action' : 'Choose an action'}</h2>
          </div>
          <div className="picker-actions">
            {!creating && currentBinding && <button className="clear-button" onClick={onRemove} type="button"><Trash2 size={15} /> Remove</button>}
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        {creating ? (
          <CustomActionForm
            submitLabel="Create and assign"
            onSubmit={(action) => onCreate(action, { controlId, actionId: action.id, label: action.label, detail: action.detail, trigger })}
          />
        ) : (
          <>
            <div className="picker-toolbar">
              <label className="search-field"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions" /></label>
              <button className="new-action-button" onClick={() => setCreating(true)} type="button"><Plus size={16} /> New action</button>
            </div>
            <div className="action-grid">
              {filtered.map((action) => {
                const Icon = action.icon
                const selected = action.id === currentBinding?.actionId
                return (
                  <button key={action.id} className={`action-option ${selected ? 'selected' : ''}`} type="button" onClick={() => onSelect({ controlId, actionId: action.id, label: action.label, detail: action.detail, trigger })}>
                    <span className="action-icon"><Icon size={19} /></span>
                    <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                    {selected && <Check className="action-check" size={17} />}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
