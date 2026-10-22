import { useRef, useState } from 'react'
import { Activity, AirVent, ArrowUpRight, ChevronRight, CircleCheck, CircleHelp, ClipboardCheck, Cpu, FileJson, Gauge, LoaderCircle, Moon, Network, Play, Radio, ScanLine, Settings2, ShieldCheck, Sparkles, Sun, Thermometer, Upload, Waves, Wifi, Zap } from 'lucide-react'
import AccessGate from './AccessGate'
import ControllerParameterEditor from './ControllerParameterEditor'
import DamperPerformancePanel from './DamperPerformancePanel'
import DeviceCompatibilityPanel from './DeviceCompatibilityPanel'
import FirmwareUpgradePanel from './FirmwareUpgradePanel'
import HelpCenterPanel from './HelpCenterPanel'
import NetworkCliPanel from './NetworkCliPanel'
import ProcedureAssistantPanel from './ProcedureAssistantPanel'

type Transport = 'BACnet/IP' | 'MS/TP'

type Point = { name: string; value: string; unit: string; status: 'ready' | 'review' }
type Sequence = { name: string; application: 'VAV' | 'FPB'; setpoints: { temperature: number; minFlow: number; maxFlow: number; humidity: number }; controls: { damper: boolean; fan: boolean; reheat: boolean } }

const starterSequence: Sequence = { name: 'Lab 02 VAV sequence', application: 'VAV', setpoints: { temperature: 22, minFlow: 180, maxFlow: 620, humidity: 55 }, controls: { damper: true, fan: false, reheat: true } }

const points: Point[] = [
  { name: 'Zone temperature', value: '22.4', unit: '°C', status: 'ready' },
  { name: 'Space setpoint', value: '22.0', unit: '°C', status: 'ready' },
  { name: 'Measured airflow', value: '318', unit: 'm³/h', status: 'ready' },
  { name: 'Damper command', value: '42', unit: '%', status: 'review' },
]

const checks = [
  { label: 'Device identity and firmware', detail: 'QTQP / instance 14021', done: true },
  { label: 'Sensor and actuator point map', detail: '12 of 12 points resolved', done: true },
  { label: 'Airflow sensor zero', detail: 'Ready to run guided test', done: false },
  { label: 'Minimum and maximum flow', detail: 'Not started', done: false },
]

function App() {
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('autofvmc-appearance') === 'dark')
  const [transport, setTransport] = useState<Transport>('BACnet/IP')
  const [connected, setConnected] = useState(false)
  const [running, setRunning] = useState(false)
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [sequenceError, setSequenceError] = useState('')
  const [networkScanning, setNetworkScanning] = useState(false)
  const [networkMapped, setNetworkMapped] = useState(false)
  const [deploymentArmed, setDeploymentArmed] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadSequence = (file: File) => {
    setSequenceError('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Sequence
        if (!parsed.name || !['VAV', 'FPB'].includes(parsed.application) || !parsed.setpoints || !parsed.controls) throw new Error('Missing sequence fields')
        setSequence(parsed)
        setDeploymentArmed(false)
      } catch {
        setSequenceError('Upload a valid AutoFVMC JSON sequence with application, setpoints, and controls.')
      }
    }
    reader.readAsText(file)
  }

  const scanNetwork = () => {
    setNetworkScanning(true)
    setNetworkMapped(false)
    window.setTimeout(() => { setNetworkScanning(false); setNetworkMapped(true); setConnected(true) }, 900)
  }

  if (!employeeNumber) return <AccessGate onAuthenticated={setEmployeeNumber} />

  return (
    <main className={`app-shell${darkMode ? ' theme-dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Waves size={20} /></div><div><strong>AutoFVMC</strong><span>AI commissioning</span></div></div>
        <div className="site-switcher"><span>ACTIVE SITE</span><strong>North Campus · Lab 02</strong><small>3 controllers online <span className="dot" /></small></div>
        <nav>
          <a className="active"><Gauge size={17} /> Overview</a>
          <a><Network size={17} /> Device discovery <b>3</b></a>
          <a><ClipboardCheck size={17} /> Commissioning</a>
          <a><Activity size={17} /> Trends</a>
        </nav>
        <div className="sidebar-bottom"><a><Settings2 size={17} /> Project settings</a><a><CircleHelp size={17} /> Help center</a><div className="profile"><div className="avatar">JM</div><div><strong>Jordan Miles</strong><span>Controls engineer</span></div><ChevronRight size={15} /></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">COMMISSIONING CONSOLE / QTQP</p><h1>Good morning, Engineer Zorix <span>✦</span></h1></div><div className="top-actions"><button className="icon-button" aria-label={darkMode ? 'Switch to light appearance' : 'Switch to dark appearance'} title={darkMode ? 'Switch to light appearance' : 'Switch to dark appearance'} onClick={() => { const nextMode = !darkMode; setDarkMode(nextMode); window.localStorage.setItem('autofvmc-appearance', nextMode ? 'dark' : 'light') }}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button" aria-label="AI assistant"><Sparkles size={18} /></button><button className="primary-button" onClick={() => setConnected(!connected)}><Radio size={16} /> {connected ? 'Connected' : 'Connect to network'}</button></div></header>

        <div className="connection-banner"><div className="connection-icon"><ShieldCheck size={20} /></div><div><strong>{connected ? 'Network session active' : 'Commissioning workspace ready'}</strong><span>{connected ? `${transport} · 192.168.10.42 · Last scan just now` : 'Connect to begin discovering QTQP controllers on the selected transport'}</span></div><div className="banner-meta"><span className={`status-pill ${connected ? 'live' : ''}`}><span className="status-dot" />{connected ? 'Online' : 'Offline'}</span><button className="text-button">View log <ArrowUpRight size={14} /></button></div></div>

        <div className="workspace-grid">
          <section className="main-column">
            <div className="section-heading"><div><p className="eyebrow">WORKSPACE</p><h2>Controller overview</h2></div><button className="quiet-button"><Settings2 size={15} /> Configure view</button></div>
            <div className="metric-grid"><Metric icon={<Cpu />} label="Controllers" value="03" note="2 VAV · 1 FPB" accent="blue" /><Metric icon={<AirVent />} label="Airflow health" value="94%" note="Within target range" accent="teal" /><Metric icon={<Thermometer />} label="Zones stable" value="11 / 12" note="1 needs review" accent="amber" /></div>

            <DeviceCompatibilityPanel />
            <NetworkCliPanel employeeNumber={employeeNumber} />
            <ControllerParameterEditor />
            <DamperPerformancePanel employeeNumber={employeeNumber} />
            <FirmwareUpgradePanel employeeNumber={employeeNumber} />
            <ProcedureAssistantPanel employeeNumber={employeeNumber} />
            <HelpCenterPanel employeeNumber={employeeNumber} />

            <div className="panel automation-panel"><div className="panel-header"><div><span className="panel-kicker"><Upload size={11} /> FAST COMMISSIONING</span><h3>Upload sequence and run</h3><p>Load the approved engineering sequence once. AutoFVMC validates it before any write.</p></div><button className="quiet-button" onClick={() => fileInput.current?.click()}><Upload size={14} /> Upload JSON</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => event.target.files?.[0] && loadSequence(event.target.files[0])} /></div><div className="automation-grid"><div className="drop-zone" onClick={() => fileInput.current?.click()}><FileJson size={23} /><strong>{sequence ? sequence.name : 'Drop an engineering sequence here'}</strong><span>{sequence ? `${sequence.application} profile · validated structure` : 'JSON profile for VAV or FPB QTQP applications'}</span></div><div className="network-check"><div className="network-check-title"><Wifi size={16} /><strong>Computer network match</strong><span className={networkMapped ? 'ok' : ''}>{networkMapped ? 'Matched' : 'Not scanned'}</span></div><p>{networkMapped ? 'Local adapter 192.168.10.18/24 matches QTQP at 192.168.10.42.' : 'Find the active adapter, compare subnet, then verify BACnet reachability.'}</p><button className="outline-button" onClick={scanNetwork} disabled={networkScanning}>{networkScanning ? <><LoaderCircle size={14} className="spin" /> Scanning range...</> : <><ScanLine size={14} /> Scan and map network</>}</button></div></div>{sequenceError && <p className="validation-error">{sequenceError}</p>}{sequence && <div className="sequence-summary"><div><span>TEMPERATURE</span><strong>{sequence.setpoints.temperature}°C</strong></div><div><span>AIRFLOW RANGE</span><strong>{sequence.setpoints.minFlow}–{sequence.setpoints.maxFlow} m³/h</strong></div><div><span>HUMIDITY LIMIT</span><strong>{sequence.setpoints.humidity}%</strong></div><div><span>ACTUATORS</span><strong>{Object.values(sequence.controls).filter(Boolean).length} enabled</strong></div><label><input type="checkbox" checked={deploymentArmed} onChange={(event) => setDeploymentArmed(event.target.checked)} /> I reviewed the mapped points and authorize a validated download</label></div>}</div>

            <div className="panel controller-panel"><div className="panel-header"><div><span className="panel-kicker"><span className="green-dot" /> DISCOVERED DEVICE</span><h3>VAV-14 · QTQP</h3><p>North Campus / Lab 02 / Terminal 14</p></div><button className="more-button">•••</button></div><div className="controller-status"><div className="device-visual"><div className="device-ring"><AirVent size={26} /></div><span>VAV controller</span></div><div className="device-detail"><span>TRANSPORT</span><strong>{transport}</strong><small>{transport === 'BACnet/IP' ? '192.168.10.42' : 'MAC 14 · 38400 baud'}</small></div><div className="device-detail"><span>LAST POLL</span><strong>2 sec ago</strong><small>Round trip 38 ms</small></div><div className="device-detail"><span>APPLICATION</span><strong>VAV + reheat</strong><small>Firmware 2.6.1</small></div></div><div className="transport-tabs"><span>Network transport</span><button className={transport === 'BACnet/IP' ? 'selected' : ''} onClick={() => setTransport('BACnet/IP')}>BACnet/IP</button><button className={transport === 'MS/TP' ? 'selected' : ''} onClick={() => setTransport('MS/TP')}>MS/TP</button><span className="transport-note"><Zap size={13} /> Secure session required for writes</span></div></div>

            <div className="section-heading points-heading"><div><p className="eyebrow">LIVE TELEMETRY</p><h2>Point map</h2></div><button className="quiet-button">View all points <ArrowUpRight size={15} /></button></div><div className="points-grid">{points.map((point) => <div className="point-card" key={point.name}><div className="point-top"><span>{point.name}</span><span className={`point-state ${point.status}`}>{point.status === 'ready' ? 'Mapped' : 'Review'}</span></div><strong>{point.value}<small>{point.unit}</small></strong><div className="sparkline"><i /><i /><i /><i /><i /><i /><i /></div></div>)}</div>
          </section>

          <aside className="right-column"><div className="section-heading"><div><p className="eyebrow">NEXT BEST ACTION</p><h2>Commissioning</h2></div></div><div className="panel ai-panel"><div className="ai-heading"><div className="ai-icon"><Sparkles size={18} /></div><div><strong>AI review</strong><span>Based on current telemetry</span></div></div><p>Damper response looks healthy. Run an airflow zero test before balancing to reduce downstream calibration time.</p><button className="outline-button" onClick={() => setRunning(!running)}><Play size={14} /> {running ? 'Test running...' : 'Start guided test'}</button></div><div className="panel checklist"><div className="panel-title"><h3>VAV-14 checklist</h3><span>2 / 4</span></div>{checks.map((check) => <div className="check-row" key={check.label}><div className={`check-icon ${check.done ? 'done' : ''}`}>{check.done ? <CircleCheck size={16} /> : <span />}</div><div><strong>{check.label}</strong><span>{check.detail}</span></div>{!check.done && <ChevronRight size={15} />}</div>)}<button className="full-button">Open commissioning workflow <ChevronRight size={15} /></button></div><div className="panel fpb-card"><div className="fpb-icon"><AirVent size={18} /></div><div><span className="panel-kicker">FPB CONTROLLER</span><h3>FPB-03 is ready</h3><p>Fan proving and reheat sequence available</p></div><ChevronRight size={17} /></div></aside>
        </div>
      </section>
    </main>
  )
}

function Metric({ icon, label, value, note, accent }: { icon: React.ReactNode; label: string; value: string; note: string; accent: string }) {
  return <div className="metric-card"><div className={`metric-icon ${accent}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>
}

export default App
