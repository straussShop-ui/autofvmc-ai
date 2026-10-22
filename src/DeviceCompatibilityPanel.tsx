import { useState } from 'react'
import { Check, ChevronDown, GitBranch, SlidersHorizontal } from 'lucide-react'

type DeviceProfile = {
  vendor: string
  model: string
  application: string
  instance: string
}

const starterProfiles: DeviceProfile[] = [
  { vendor: 'iSMA CONTROLLI', model: 'QTQP', application: 'VAV / FPB', instance: '14021' },
  { vendor: 'Generic BACnet', model: 'Any discovered model', application: 'Custom sequence', instance: 'Auto-detected' },
]

export default function DeviceCompatibilityPanel() {
  const [profile, setProfile] = useState(starterProfiles[0])
  const [mappingMode, setMappingMode] = useState<'auto' | 'manual'>('auto')

  return <div className="panel compatibility-panel"><div className="compatibility-heading"><div><span className="panel-kicker"><GitBranch size={11} /> DEVICE COMPATIBILITY</span><h3>Use any BACnet controller</h3><p>Identify the device from discovery, then map its objects to the engineering sequence.</p></div><SlidersHorizontal size={18} /></div><div className="compatibility-controls"><label>Vendor / model<select value={`${profile.vendor}|${profile.model}`} onChange={(event) => { const next = starterProfiles.find((item) => `${item.vendor}|${item.model}` === event.target.value); if (next) setProfile(next) }}>{starterProfiles.map((item) => <option key={`${item.vendor}|${item.model}`} value={`${item.vendor}|${item.model}`}>{item.vendor} · {item.model}</option>)}</select></label><label>Application<select value={profile.application} onChange={(event) => setProfile({ ...profile, application: event.target.value })}><option>VAV / FPB</option><option>VAV</option><option>FPB</option><option>Custom sequence</option></select></label><label>Device instance<input value={profile.instance} onChange={(event) => setProfile({ ...profile, instance: event.target.value })} /></label></div><div className="mapping-mode"><span>Point mapping</span><button className={mappingMode === 'auto' ? 'selected' : ''} onClick={() => setMappingMode('auto')}><Check size={13} /> Auto-map by BACnet object names</button><button className={mappingMode === 'manual' ? 'selected' : ''} onClick={() => setMappingMode('manual')}><SlidersHorizontal size={13} /> Review manually</button><small>{mappingMode === 'auto' ? 'Unmatched objects are flagged for review before writes.' : 'Engineer confirms each sensor and actuator object.'}</small></div></div>
}
