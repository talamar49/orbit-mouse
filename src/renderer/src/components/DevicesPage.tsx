import { BookOpen, Download, FolderCode, Keyboard, Mouse, PackageCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CommunityDeviceManifest, CustomActionDefinition, DeviceSnapshot, DriverInfo } from '../../../shared/device'
import { DeviceBuilder } from './DeviceBuilder'

interface DevicesPageProps {
  device: DeviceSnapshot
  customActions: readonly CustomActionDefinition[]
  onNotice: (message: string) => void
}

const browserDrivers: DriverInfo[] = [{
  id: 'logitech-hidpp', name: 'Logitech HID++', source: 'core', deviceKinds: ['mouse'], supportedModels: ['MX Master 4'], contributedActions: []
}]

export function DevicesPage({ device, customActions, onNotice }: DevicesPageProps): React.JSX.Element {
  const [drivers, setDrivers] = useState<DriverInfo[]>(browserDrivers)
  const [manifests, setManifests] = useState<CommunityDeviceManifest[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingManifest, setEditingManifest] = useState<CommunityDeviceManifest | undefined>()

  useEffect(() => {
    if (!window.orbit) return
    void Promise.all([window.orbit.listDrivers(), window.orbit.listDeviceManifests()])
      .then(([nextDrivers, nextManifests]) => { setDrivers(nextDrivers); setManifests(nextManifests) })
      .catch(() => onNotice('Could not read installed drivers or device definitions.'))
  }, [onNotice])

  const open = async (target: 'docs' | 'folder'): Promise<void> => {
    if (!window.orbit) {
      onNotice('Driver development links are available in the desktop app.')
      return
    }
    const result = target === 'docs' ? await window.orbit.openDriverDocs() : await window.orbit.openDriverFolder()
    if (!result.ok) onNotice(result.message ?? 'Could not open that location.')
  }

  const saveManifest = async (manifest: CommunityDeviceManifest): Promise<void> => {
    if (window.orbit) {
      const result = await window.orbit.saveDeviceManifest(manifest)
      if (!result.ok) { onNotice(result.message ?? 'Could not save the device definition.'); return }
    }
    setManifests((current) => [...current.filter((candidate) => candidate.id !== manifest.id), manifest])
    setBuilderOpen(false)
    setEditingManifest(undefined)
    onNotice(`${manifest.name} device definition saved.`)
  }

  const deleteManifest = async (manifest: CommunityDeviceManifest): Promise<void> => {
    if (!window.confirm(`Delete the ${manifest.name} device definition?`)) return
    if (window.orbit) {
      const result = await window.orbit.deleteDeviceManifest(manifest.id)
      if (!result.ok) { onNotice(result.message ?? 'Could not delete the device definition.'); return }
    }
    setManifests((current) => current.filter((candidate) => candidate.id !== manifest.id))
    onNotice(`${manifest.name} device definition deleted.`)
  }

  const exportManifest = async (manifest: CommunityDeviceManifest): Promise<void> => {
    if (!window.orbit) { onNotice('Export is available in the desktop app.'); return }
    const result = await window.orbit.exportDeviceManifest(manifest)
    onNotice(result.ok ? `Device definition exported to ${result.path}.` : result.message ?? 'Could not export the device definition.')
  }

  return (
    <>
      <div className="settings-page library-page">
      <header className="page-heading"><div><span className="eyebrow">HARDWARE PLATFORM</span><h1>Devices & extensions</h1><p>Orbit discovers peripherals through small, capability-based drivers.</p></div><button className="primary-button heading-button" onClick={() => { setEditingManifest(undefined); setBuilderOpen(true) }} type="button"><Plus size={15} /> Add device definition</button></header>

      <section className="connected-device-card">
        <span className="device-kind-icon">{device.kind === 'keyboard' ? <Keyboard size={24} /> : <Mouse size={24} />}</span>
        <span><small>CONNECTED DEVICE</small><strong>{device.name}</strong><em>{device.connection === 'bluetooth' ? 'Bluetooth' : device.connection === 'bolt' ? 'Logi Bolt' : device.connection}</em></span>
        <i className={device.access === 'ready' ? 'ready' : ''}>{device.access === 'ready' ? 'READY' : device.access.toUpperCase()}</i>
      </section>

      <section className="library-section">
        <div className="section-heading"><div><h2>Visual device definitions</h2><p>Portable photos, control maps, triggers, settings schemas, and driver actions.</p></div></div>
        {manifests.length ? <div className="manifest-grid">{manifests.map((manifest) => (
          <article className="manifest-card" key={manifest.id}>
            <div className="manifest-image"><img src={manifest.imageDataUrl} alt={manifest.name} />{manifest.controls.map((control, index) => <i key={control.id} style={{ left: `${control.x}%`, top: `${control.y}%` }}>{index + 1}</i>)}</div>
            <div className="manifest-card-copy"><small>{manifest.kind.toUpperCase()} · {manifest.vendor}</small><h3>{manifest.name}</h3><p>{manifest.controls.length} controls · {manifest.capabilityIds.length} capabilities · {manifest.actionDefinitions.length} driver actions</p></div>
            <div className="manifest-actions"><button onClick={() => void exportManifest(manifest)} type="button" aria-label={`Export ${manifest.name}`}><Download size={15} /></button><button onClick={() => { setEditingManifest(manifest); setBuilderOpen(true) }} type="button" aria-label={`Edit ${manifest.name}`}><Pencil size={15} /></button><button onClick={() => void deleteManifest(manifest)} type="button" aria-label={`Delete ${manifest.name}`}><Trash2 size={15} /></button></div>
          </article>
        ))}</div> : <button className="empty-device-definition" onClick={() => setBuilderOpen(true)} type="button"><Plus size={20} /><span><strong>Create the first visual device definition</strong><small>Import a photo, place controls, and declare every capability.</small></span></button>}
      </section>

      <section className="library-section">
        <div className="section-heading"><div><h2>Installed drivers</h2><p>Each driver defines its controls, telemetry, and device-specific settings.</p></div></div>
        <div className="driver-grid">
          {drivers.map((driver) => (
            <article className="driver-card" key={driver.id}>
              <div><span className="library-icon"><PackageCheck size={18} /></span><i>{driver.source.toUpperCase()}</i></div>
              <h3>{driver.name}</h3>
              <p>{driver.supportedModels.join(', ') || 'Models are discovered dynamically'}</p>
              <footer>{driver.deviceKinds.map((kind) => <span key={kind}>{kind === 'mouse' ? <Mouse size={13} /> : <Keyboard size={13} />}{kind}</span>)}{driver.contributedActions.length > 0 && <span>{driver.contributedActions.length} actions</span>}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="extension-callout">
        <div><span className="eyebrow">COMMUNITY DRIVER API · V1</span><h2>Add another mouse or keyboard</h2><p>Implement discovery, raw control events, device-specific settings, commands, and contributed actions. Orbit supplies press, double-press, long-press, profiles, and the shared UI. Drivers are reviewed source modules registered at build time so hardware access stays auditable.</p></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => void open('folder')} type="button"><FolderCode size={15} /> Open driver folder</button>
          <button className="primary-button" onClick={() => void open('docs')} type="button"><BookOpen size={15} /> Developer guide</button>
        </div>
      </section>
      </div>
      {builderOpen ? <DeviceBuilder initialManifest={editingManifest} availableCustomActions={customActions} onCancel={() => { setBuilderOpen(false); setEditingManifest(undefined) }} onSave={(manifest) => void saveManifest(manifest)} /> : null}
    </>
  )
}
