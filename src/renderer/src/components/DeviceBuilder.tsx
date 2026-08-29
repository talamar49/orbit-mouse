import { ArrowLeft, Check, ImagePlus, MousePointer2, Plus, Save, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ActionTrigger, CommunityDeviceManifest, CustomActionDefinition, DeviceActionDefinition, DeviceSettingsSection, VisualControlDefinition } from '../../../shared/device'
import { actions } from '../data/actions'

interface DeviceBuilderProps {
  initialManifest?: CommunityDeviceManifest
  availableCustomActions: readonly CustomActionDefinition[]
  onCancel: () => void
  onSave: (manifest: CommunityDeviceManifest) => void
}

type BuilderStep = 'identity' | 'controls' | 'capabilities' | 'review'

const builderSteps: Array<{ id: BuilderStep; label: string }> = [
  { id: 'identity', label: 'Device & photo' },
  { id: 'controls', label: 'Visual controls' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'review', label: 'Review' }
]

const triggerOptions: Array<{ id: ActionTrigger; label: string }> = [
  { id: 'press', label: 'Press' },
  { id: 'double-press', label: 'Double press' },
  { id: 'long-press', label: 'Long press' }
]

const capabilityOptions = [
  { id: 'programmable-controls', label: 'Programmable controls', detail: 'Visual button assignments and every trigger type', required: true },
  { id: 'pointer-dpi', label: 'Pointer & DPI', detail: 'Speed and sensitivity settings' },
  { id: 'smartshift-wheel', label: 'SmartShift wheel', detail: 'Ratchet/free-spin threshold and force' },
  { id: 'horizontal-wheel', label: 'Horizontal wheel', detail: 'Speed and direction settings' },
  { id: 'battery', label: 'Battery telemetry', detail: 'Real percentage supplied by the driver' },
  { id: 'haptics', label: 'Haptic feedback', detail: 'Intensity, enablement, and test commands' },
  { id: 'device-settings', label: 'Driver settings', detail: 'A device-owned settings section' },
  { id: 'driver-actions', label: 'Driver actions', detail: 'Actions implemented by the hardware driver' }
]

function manifestSections(name: string, capabilityIds: readonly string[]): DeviceSettingsSection[] {
  const sections: DeviceSettingsSection[] = [{
    id: 'assignments', label: 'Controls', icon: 'buttons', kind: 'assignments',
    title: 'Configure controls', description: 'Select a marker on the device to change its action.'
  }]
  const fields: NonNullable<DeviceSettingsSection['fields']> = []
  if (capabilityIds.includes('pointer-dpi')) {
    fields.push({ type: 'range', key: 'dpi', label: 'DPI', min: 200, max: 8000, step: 50 })
    fields.push({ type: 'range', key: 'pointerSpeed', label: 'Pointer speed', min: 0, max: 100, step: 1, suffix: '%' })
  }
  if (capabilityIds.includes('smartshift-wheel')) {
    fields.push({ type: 'toggle', key: 'smartShift', label: 'SmartShift' })
    fields.push({ type: 'range', key: 'smartShiftThreshold', label: 'SmartShift threshold', min: 0, max: 100, step: 1, suffix: '%' })
    fields.push({ type: 'range', key: 'scrollForce', label: 'Scroll force', min: 0, max: 100, step: 1, suffix: '%' })
  }
  if (capabilityIds.includes('horizontal-wheel')) {
    fields.push({ type: 'range', key: 'thumbWheelSpeed', label: 'Horizontal wheel speed', min: 0, max: 100, step: 1, suffix: '%' })
  }
  if (capabilityIds.includes('haptics')) {
    fields.push({ type: 'toggle', key: 'hapticsEnabled', label: 'Haptic feedback' })
    fields.push({ type: 'range', key: 'hapticIntensity', label: 'Haptic intensity', min: 0, max: 100, step: 1, suffix: '%' })
  }
  if (fields.length || capabilityIds.includes('device-settings')) {
    sections.push({
      id: 'device-settings', label: 'Device settings', icon: 'settings', kind: 'settings',
      title: `${name || 'Device'} settings`, description: 'Capabilities implemented by this device driver.', fields,
      commands: capabilityIds.includes('haptics') ? [
        { id: 'haptic.soft-boundary', label: 'Soft boundary', description: 'Test the subtle haptic waveform' },
        { id: 'haptic.firm-confirmation', label: 'Firm confirmation', description: 'Test the firm haptic waveform' }
      ] : []
    })
  }
  return sections
}

function fileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the image.'))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'))
    reader.readAsDataURL(file)
  })
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function DeviceBuilder({ initialManifest, availableCustomActions, onCancel, onSave }: DeviceBuilderProps): React.JSX.Element {
  const [step, setStep] = useState<BuilderStep>('identity')
  const [name, setName] = useState(initialManifest?.name ?? '')
  const [vendor, setVendor] = useState(initialManifest?.vendor ?? 'Logitech')
  const [model, setModel] = useState(initialManifest?.model ?? '')
  const [kind, setKind] = useState<'mouse' | 'keyboard'>(initialManifest?.kind ?? 'mouse')
  const [imageDataUrl, setImageDataUrl] = useState(initialManifest?.imageDataUrl ?? '')
  const [controls, setControls] = useState<VisualControlDefinition[]>(initialManifest?.controls ?? [])
  const [selectedControlId, setSelectedControlId] = useState<string | null>(initialManifest?.controls[0]?.id ?? null)
  const [capabilityIds, setCapabilityIds] = useState<string[]>(initialManifest?.capabilityIds ?? ['programmable-controls'])
  const [actionDefinitions, setActionDefinitions] = useState<DeviceActionDefinition[]>(initialManifest?.actionDefinitions ?? [])
  const [error, setError] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const photoFrame = useRef<HTMLDivElement>(null)

  const selectedControl = controls.find((control) => control.id === selectedControlId)
  const customActionMap = new Map([...availableCustomActions, ...(initialManifest?.customActions ?? [])].map((action) => [action.id, action]))
  const actionOptions = [...actions.map(({ id, label }) => ({ id, label })), ...actionDefinitions.map(({ id, label }) => ({ id, label })), ...customActionMap.values()].map(({ id, label }) => ({ id, label }))

  const updateControl = (controlId: string, update: Partial<VisualControlDefinition>): void => {
    setControls((current) => current.map((control) => control.id === controlId ? { ...control, ...update } : control))
  }

  const addControlAt = (x: number, y: number): void => {
    const number = controls.length + 1
    const id = `control-${crypto.randomUUID().slice(0, 8)}`
    const control: VisualControlDefinition = {
      id, label: `Control ${number}`, type: kind === 'keyboard' ? 'key' : 'button',
      x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)),
      triggers: ['press', 'double-press', 'long-press'], defaultActions: {}
    }
    setControls((current) => [...current, control])
    setSelectedControlId(id)
  }

  const positionFromPointer = (event: { clientX: number; clientY: number }): { x: number; y: number } | null => {
    const frame = photoFrame.current
    if (!frame) return null
    const bounds = frame.getBoundingClientRect()
    return { x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100 }
  }

  const chooseImage = async (file?: File): Promise<void> => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose a PNG, JPEG, WebP, or AVIF image.')
      return
    }
    if (file.size > 12_000_000) {
      setError('The image must be smaller than 12 MB.')
      return
    }
    try {
      setImageDataUrl(await fileDataUrl(file))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read the image.')
    }
  }

  const save = (): void => {
    if (!name.trim() || !vendor.trim() || !model.trim()) {
      setStep('identity'); setError('Device name, vendor, and model are required.'); return
    }
    if (!imageDataUrl) {
      setStep('identity'); setError('Add a device photo before saving.'); return
    }
    if (!controls.length) {
      setStep('controls'); setError('Place at least one control on the photo.'); return
    }
    const now = new Date().toISOString()
    const id = initialManifest?.id ?? `community.${slug(vendor) || 'vendor'}.${slug(model) || 'device'}-${crypto.randomUUID().slice(0, 8)}`
    const referencedActionIds = new Set(controls.flatMap((control) => Object.values(control.defaultActions).filter((actionId): actionId is string => Boolean(actionId))))
    onSave({
      format: 'orbit-device', version: 1, id, name: name.trim(), vendor: vendor.trim(), model: model.trim(), kind,
      imageDataUrl, controls, capabilityIds, actionDefinitions,
      customActions: [...customActionMap.values()].filter((action) => referencedActionIds.has(action.id)),
      settingsSections: manifestSections(name.trim(), capabilityIds),
      createdAt: initialManifest?.createdAt ?? now, updatedAt: now
    })
  }

  return (
    <div className="device-builder-backdrop">
      <section className="device-builder" role="dialog" aria-modal="true" aria-label={initialManifest ? `Edit ${initialManifest.name}` : 'Create device definition'}>
        <header className="builder-header">
          <div><button className="icon-button" onClick={onCancel} type="button" aria-label="Close builder"><ArrowLeft size={18} /></button><span><small>DEVICE DEFINITION</small><strong>{initialManifest ? `Edit ${initialManifest.name}` : 'Add a device'}</strong></span></div>
          <button className="icon-button" onClick={onCancel} type="button" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="builder-body">
          <nav className="builder-steps" aria-label="Device builder steps">
            {builderSteps.map((item, index) => <button className={step === item.id ? 'active' : ''} onClick={() => setStep(item.id)} type="button" key={item.id}><span>{index + 1}</span>{item.label}{step === item.id ? <Check size={14} /> : null}</button>)}
          </nav>
          <main className="builder-content">
            {step === 'identity' ? (
              <div className="builder-identity">
                <div className="builder-copy"><span className="eyebrow">FOUNDATION</span><h1>Start with the real device.</h1><p>Use a clean top or three-quarter photo. This image becomes the reusable visual map for every assignment.</p></div>
                <div className="identity-grid">
                  <button className={`photo-drop ${imageDataUrl ? 'has-image' : ''}`} onClick={() => imageInput.current?.click()} type="button">
                    {imageDataUrl ? <img src={imageDataUrl} alt="Imported device" /> : <><ImagePlus size={27} /><strong>Add device photo</strong><small>PNG, JPEG, WebP or AVIF · up to 12 MB</small></>}
                  </button>
                  <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => void chooseImage(event.target.files?.[0])} />
                  <div className="identity-fields">
                    <label className="form-field"><span>Device name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="MX Anywhere 4" /></label>
                    <div className="form-row"><label className="form-field"><span>Vendor</span><input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Logitech" /></label><label className="form-field"><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model identifier" /></label></div>
                    <div className="action-type-switch"><button className={kind === 'mouse' ? 'active' : ''} onClick={() => setKind('mouse')} type="button">Mouse</button><button className={kind === 'keyboard' ? 'active' : ''} onClick={() => setKind('keyboard')} type="button">Keyboard</button></div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 'controls' ? (
              <div className="control-builder-layout">
                <section className="visual-placement">
                  <div className="builder-copy"><span className="eyebrow">INTERACTIVE MAP</span><h1>Place every physical control.</h1><p>Click the photo to add a marker. Drag markers to align them precisely.</p></div>
                  {imageDataUrl ? (
                    <div className="placement-stage">
                      <div className="photo-frame" ref={photoFrame} onClick={(event) => { const position = positionFromPointer(event); if (position) addControlAt(position.x, position.y) }}>
                        <img src={imageDataUrl} alt={`${name || 'Device'} control map`} draggable={false} />
                        {controls.map((control, index) => (
                          <button
                            className={`builder-marker ${selectedControlId === control.id ? 'active' : ''}`}
                            style={{ left: `${control.x}%`, top: `${control.y}%` }} key={control.id} type="button" aria-label={control.label}
                            onClick={(event) => { event.stopPropagation(); setSelectedControlId(control.id) }}
                            onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedControlId(control.id) }}
                            onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const position = positionFromPointer(event); if (position) updateControl(control.id, position) }}
                          >{index + 1}</button>
                        ))}
                      </div>
                    </div>
                  ) : <button className="empty-placement" onClick={() => { setStep('identity'); imageInput.current?.click() }} type="button"><ImagePlus size={24} />Add a photo first</button>}
                </section>
                <aside className="control-inspector">
                  {selectedControl ? (
                    <>
                      <div className="inspector-heading"><span><MousePointer2 size={17} /></span><div><small>SELECTED CONTROL</small><strong>{selectedControl.label}</strong></div><button onClick={() => { setControls((current) => current.filter((control) => control.id !== selectedControl.id)); setSelectedControlId(null) }} type="button" aria-label={`Delete ${selectedControl.label}`}><Trash2 size={16} /></button></div>
                      <label className="form-field"><span>Label</span><input value={selectedControl.label} onChange={(event) => updateControl(selectedControl.id, { label: event.target.value })} /></label>
                      <label className="form-field"><span>Stable control ID</span><input value={selectedControl.id} onChange={(event) => { const nextId = slug(event.target.value); setSelectedControlId(nextId); updateControl(selectedControl.id, { id: nextId }) }} /></label>
                      <label className="form-field"><span>Control type</span><select value={selectedControl.type} onChange={(event) => updateControl(selectedControl.id, { type: event.target.value as VisualControlDefinition['type'] })}><option value="button">Button</option><option value="wheel">Wheel</option><option value="touch-zone">Touch zone</option><option value="key">Keyboard key</option></select></label>
                      <div className="inspector-section"><strong>Triggers & default actions</strong>{triggerOptions.map((trigger) => {
                        const enabled = selectedControl.triggers.includes(trigger.id)
                        return <div className="trigger-builder-row" key={trigger.id}><label><input type="checkbox" checked={enabled} onChange={(event) => updateControl(selectedControl.id, { triggers: event.target.checked ? [...selectedControl.triggers, trigger.id] : selectedControl.triggers.filter((id) => id !== trigger.id) })} />{trigger.label}</label><select disabled={!enabled} value={selectedControl.defaultActions[trigger.id] ?? ''} onChange={(event) => updateControl(selectedControl.id, { defaultActions: { ...selectedControl.defaultActions, [trigger.id]: event.target.value || undefined } })}><option value="">Unassigned</option>{actionOptions.map((action) => <option value={action.id} key={action.id}>{action.label}</option>)}</select></div>
                      })}</div>
                    </>
                  ) : <div className="inspector-empty"><MousePointer2 size={22} /><strong>Select or place a control</strong><p>Each marker gets its own name, trigger support, and default actions.</p></div>}
                </aside>
              </div>
            ) : null}

            {step === 'capabilities' ? (
              <div className="builder-capabilities">
                <div className="builder-copy"><span className="eyebrow">CAPABILITY SCHEMA</span><h1>Describe everything the driver can provide.</h1><p>These declarations generate the same adaptable settings architecture used by the MX Master 4. Hardware code can be implemented later.</p></div>
                <div className="capability-grid">{capabilityOptions.map((capability) => {
                  const checked = capability.required || capabilityIds.includes(capability.id)
                  return <label className={`capability-option ${checked ? 'selected' : ''}`} key={capability.id}><input type="checkbox" checked={checked} disabled={capability.required} onChange={(event) => setCapabilityIds((current) => event.target.checked ? [...current, capability.id] : current.filter((id) => id !== capability.id))} /><span><strong>{capability.label}</strong><small>{capability.detail}</small></span><i>{checked ? <Check size={14} /> : null}</i></label>
                })}</div>
                <section className="driver-action-builder"><div className="section-heading"><div><h2>Device-driver actions</h2><p>Declare actions that a future adapter will execute.</p></div><button className="secondary-button" type="button" onClick={() => setActionDefinitions((current) => [...current, { id: `community.action-${crypto.randomUUID().slice(0, 8)}`, label: 'New driver action', detail: 'Describe the device behavior', category: name || 'Device' }])}><Plus size={14} /> Add action</button></div>{actionDefinitions.length ? <div className="driver-action-editor">{actionDefinitions.map((action) => <div key={action.id}><input value={action.label} aria-label="Action label" onChange={(event) => setActionDefinitions((current) => current.map((candidate) => candidate.id === action.id ? { ...candidate, label: event.target.value } : candidate))} /><input value={action.id} aria-label="Action ID" onChange={(event) => setActionDefinitions((current) => current.map((candidate) => candidate.id === action.id ? { ...candidate, id: slug(event.target.value) } : candidate))} /><input value={action.detail} aria-label="Action description" onChange={(event) => setActionDefinitions((current) => current.map((candidate) => candidate.id === action.id ? { ...candidate, detail: event.target.value } : candidate))} /><button onClick={() => setActionDefinitions((current) => current.filter((candidate) => candidate.id !== action.id))} type="button" aria-label={`Delete ${action.label}`}><Trash2 size={15} /></button></div>)}</div> : <div className="inline-empty">No driver actions declared. Native and custom actions remain available automatically.</div>}</section>
              </div>
            ) : null}

            {step === 'review' ? (
              <div className="builder-review">
                <div className="builder-copy"><span className="eyebrow">READY TO EXTEND</span><h1>Device definition summary</h1><p>This saves the visual and capability contract. A community driver can later connect it to real HID traffic.</p></div>
                <div className="review-card"><img src={imageDataUrl} alt={name || 'Device'} /><div><small>{kind.toUpperCase()}</small><h2>{name || 'Unnamed device'}</h2><p>{vendor} · {model}</p><span>{controls.length} visual controls</span><span>{capabilityIds.length} capabilities</span><span>{actionDefinitions.length} driver actions</span></div></div>
                <div className="manifest-note"><strong>Portable by design</strong><p>The exported `.orbit-device.json` contains the photo, normalized marker coordinates, trigger defaults, settings schema, and action declarations.</p></div>
              </div>
            ) : null}
            {error ? <div className="builder-error">{error}</div> : null}
          </main>
        </div>
        <footer className="builder-footer"><span>{controls.length} controls · {capabilityIds.length} capabilities</span><div>{step !== 'review' ? <button className="secondary-button" onClick={() => setStep(builderSteps[Math.min(builderSteps.findIndex((item) => item.id === step) + 1, builderSteps.length - 1)].id)} type="button">Continue</button> : null}<button className="primary-button" onClick={save} type="button"><Save size={15} /> Save device definition</button></div></footer>
      </section>
    </div>
  )
}
