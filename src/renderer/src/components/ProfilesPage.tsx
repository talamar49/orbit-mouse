import { Download, FileJson2, Keyboard, Pencil, Play, Trash2, Upload, X } from 'lucide-react'
import { useState } from 'react'
import type { CustomActionDefinition, DeviceSettings, DeviceSnapshot } from '../../../shared/device'
import { CustomActionForm } from './CustomActionForm'

interface ProfilesPageProps {
  device: DeviceSnapshot
  settings: DeviceSettings
  onExport: () => void
  onImport: () => void
  onUpdateCustomAction: (action: CustomActionDefinition) => void
  onDeleteCustomAction: (actionId: string) => void
}

export function ProfilesPage({ device, settings, onExport, onImport, onUpdateCustomAction, onDeleteCustomAction }: ProfilesPageProps): React.JSX.Element {
  const [editing, setEditing] = useState<CustomActionDefinition | null>(null)

  return (
    <div className="settings-page library-page">
      <header className="page-heading">
        <div><span className="eyebrow">PORTABLE CONFIGURATION</span><h1>Profiles</h1><p>Move the complete {device.name} setup between computers.</p></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onImport} type="button"><Upload size={15} /> Import</button>
          <button className="primary-button" onClick={onExport} type="button"><Download size={15} /> Export profile</button>
        </div>
      </header>

      <section className="summary-strip" aria-label="Profile contents">
        <div><FileJson2 size={18} /><span><strong>{settings.bindings.length}</strong><small>trigger assignments</small></span></div>
        <div><Keyboard size={18} /><span><strong>{settings.customActions.length}</strong><small>custom actions</small></span></div>
        <div><Play size={18} /><span><strong>{Object.keys(settings.driver).length}</strong><small>driver values</small></span></div>
      </section>

      <section className="library-section">
        <div className="section-heading"><div><h2>Custom actions</h2><p>Reusable shortcuts and programs available in every action picker.</p></div></div>
        {settings.customActions.length ? (
          <div className="library-list">
            {settings.customActions.map((action) => (
              <div className="library-row" key={action.id}>
                <span className="library-icon">{action.type === 'shortcut' ? <Keyboard size={18} /> : <Play size={18} />}</span>
                <span><strong>{action.label}</strong><small>{action.type === 'shortcut' ? action.shortcut : [action.executable, ...action.args].join(' ')}</small></span>
                <i>{action.type === 'shortcut' ? 'SHORTCUT' : 'PROGRAM'}</i>
                <span className="row-actions">
                  <button className="row-action" onClick={() => setEditing(action)} type="button" aria-label={`Edit ${action.label}`}><Pencil size={15} /></button>
                  <button className="row-action" onClick={() => onDeleteCustomAction(action.id)} type="button" aria-label={`Delete ${action.label}`}><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Keyboard size={20} /><div><strong>No custom actions yet</strong><p>Choose “New action” while assigning any button.</p></div></div>
        )}
      </section>
      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <section className="action-picker compact-editor" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label={`Edit ${editing.label}`}>
            <div className="picker-header"><div><span className="eyebrow">CUSTOM ACTION</span><h2>Edit action</h2></div><button className="icon-button" onClick={() => setEditing(null)} type="button" aria-label="Close"><X size={18} /></button></div>
            <CustomActionForm initialAction={editing} submitLabel="Save changes" onSubmit={(action) => { onUpdateCustomAction(action); setEditing(null) }} />
          </section>
        </div>
      )}
    </div>
  )
}
