import { Check, ChevronLeft, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { ActionTrigger, ButtonBinding, ControlId, CustomActionDefinition, DeviceActionDefinition } from '../../../shared/device'
import { actions, customActionOption, driverActionOption, type ActionOption } from '../data/actions'
import { CustomActionForm } from './CustomActionForm'

interface ActionPickerProps {
  controlId: ControlId
  trigger: ActionTrigger
  currentBinding?: ButtonBinding
  customActions: readonly CustomActionDefinition[]
  driverActions: readonly DeviceActionDefinition[]
  onSelect: (binding: ButtonBinding) => void
  onCreate: (action: CustomActionDefinition, binding: ButtonBinding) => void
  onUpdate: (action: CustomActionDefinition) => void
  onRemove: () => void
  onClose: () => void
}

const triggerNames: Record<ActionTrigger, string> = {
  press: 'Press',
  'double-press': 'Double press',
  'long-press': 'Long press'
}

export function ActionPicker({ controlId, trigger, currentBinding, customActions, driverActions, onSelect, onCreate, onUpdate, onRemove, onClose }: ActionPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CustomActionDefinition | null>(null)
  const [source, setSource] = useState<'native' | 'custom' | 'driver'>(() => {
    if (customActions.some((action) => action.id === currentBinding?.actionId)) return 'custom'
    if (driverActions.some((action) => action.id === currentBinding?.actionId)) return 'driver'
    return 'native'
  })

  const normalized = query.trim().toLowerCase()
  const isCompatible = (action: ActionOption): boolean => {
    if (controlId === 'thumbwheel') return action.id === 'horizontal-scroll'
    if (action.id === 'horizontal-scroll') return false
    return action.id !== 'wheel-mode' || controlId === 'mode-shift'
  }
  const filterOptions = (options: ActionOption[]): ActionOption[] => options
    .filter(isCompatible)
    .filter((action) => !normalized || `${action.label} ${action.detail} ${action.category}`.toLowerCase().includes(normalized))
  const nativeOptions = filterOptions(actions)
  const deviceOptions = filterOptions(driverActions.map(driverActionOption))
  const customOptions = filterOptions(customActions.map(customActionOption))

  const renderGroup = (title: string, options: ActionOption[], editable = false): React.JSX.Element | null => {
    if (!options.length) return null
    return (
      <section className="action-group">
        <h3>{title}<span>{options.length}</span></h3>
        <div className="action-group-grid">
          {options.map((action) => {
            const Icon = action.icon
            const selected = action.id === currentBinding?.actionId
            return (
              <div className="action-option-row" key={action.id}>
                <button className={`action-option ${selected ? 'selected' : ''}`} type="button" onClick={() => onSelect({ controlId, actionId: action.id, label: action.label, detail: action.detail, trigger })}>
                  <span className="action-icon"><Icon size={19} /></span>
                  <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                  {selected && <Check className="action-check" size={17} />}
                </button>
                {editable && <button className="inline-edit" onClick={() => setEditing(customActions.find((candidate) => candidate.id === action.id) ?? null)} type="button" aria-label={`Edit ${action.label}`}><Pencil size={14} /></button>}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="action-picker" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label={creating ? 'Create custom action' : editing ? 'Edit custom action' : 'Choose an action'}>
        <div className="picker-header">
          <div>
            {(creating || editing) && <button className="back-button" onClick={() => { setCreating(false); setEditing(null) }} type="button"><ChevronLeft size={15} /> Actions</button>}
            <span className="eyebrow">{triggerNames[trigger].toUpperCase()}</span>
            <h2>{creating ? 'New custom action' : editing ? 'Edit custom action' : 'Choose an action'}</h2>
          </div>
          <div className="picker-actions">
            {!creating && !editing && currentBinding && <button className="clear-button" onClick={onRemove} type="button"><Trash2 size={15} /> Remove</button>}
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
          </div>
        </div>

        {creating ? (
          <CustomActionForm
            submitLabel="Create and assign"
            onSubmit={(action) => onCreate(action, { controlId, actionId: action.id, label: action.label, detail: action.detail, trigger })}
          />
        ) : editing ? (
          <CustomActionForm initialAction={editing} submitLabel="Save changes" onSubmit={(action) => { onUpdate(action); setEditing(null) }} />
        ) : (
          <>
            <div className="picker-toolbar">
              <label className="search-field"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions" /></label>
              <button className="new-action-button" onClick={() => setCreating(true)} type="button"><Plus size={16} /> New action</button>
            </div>
            <div className="action-source-tabs" aria-label="Action source">
              <button className={source === 'native' ? 'active' : ''} onClick={() => setSource('native')} type="button">Native <span>{nativeOptions.length}</span></button>
              <button className={source === 'custom' ? 'active' : ''} onClick={() => setSource('custom')} type="button">Custom <span>{customOptions.length}</span></button>
              {driverActions.length > 0 && <button className={source === 'driver' ? 'active' : ''} onClick={() => setSource('driver')} type="button">Device driver <span>{deviceOptions.length}</span></button>}
            </div>
            <div className="action-groups">
              {source === 'native' && (renderGroup('Native actions', nativeOptions) ?? <div className="action-empty">No matching native actions.</div>)}
              {source === 'custom' && (renderGroup('Custom actions', customOptions, true) ?? <div className="action-empty">No custom actions yet. Choose New action to create one.</div>)}
              {source === 'driver' && (renderGroup('Device driver', deviceOptions) ?? <div className="action-empty">No matching driver actions.</div>)}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
