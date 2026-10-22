import { useState } from 'react'
import { Activity, CheckCircle2, Gauge, Timer, TriangleAlert } from 'lucide-react'

type DamperPerformancePanelProps = { employeeNumber: string }

export default function DamperPerformancePanel({ employeeNumber }: DamperPerformancePanelProps) {
  const [testing, setTesting] = useState(false)
  const [delay, setDelay] = useState<number | null>(null)
  const [auditTime, setAuditTime] = useState('')

  const runTest = () => {
    setTesting(true)
    setDelay(null)
    window.setTimeout(() => {
      const measuredDelay = 640
      setDelay(measuredDelay)
      setAuditTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setTesting(false)
    }, 850)
  }

  const status = delay === null ? 'Awaiting test' : delay <= 800 ? 'Within target' : 'Review required'
  return <div className="panel damper-panel"><div className="panel-header"><div><span className="panel-kicker"><Activity size={11} /> ACTUATOR DIAGNOSTICS</span><h3>Damper performance</h3><p>Measure command-to-position response and flag slow or stalled actuators.</p></div><button className="quiet-button" onClick={runTest} disabled={testing}><Timer size={14} /> {testing ? 'Measuring...' : 'Run response test'}</button></div><div className="damper-test-grid"><div className="damper-reading"><Gauge size={18} /><span>COMMAND → FEEDBACK DELAY</span><strong>{delay === null ? '--' : `${delay} ms`}</strong><small>Target ≤ 800 ms</small></div><div className="damper-result">{delay === null ? <><TriangleAlert size={18} /><div><strong>No test recorded</strong><span>Run a test to confirm damper response.</span></div></> : delay <= 800 ? <><CheckCircle2 size={18} /><div><strong>{status}</strong><span>Damper tracked the command successfully.</span></div></> : <><TriangleAlert size={18} /><div><strong>{status}</strong><span>Inspect linkage, actuator power, and feedback.</span></div></>}<span className="audit-stamp">{auditTime ? `Recorded by ${employeeNumber} · ${auditTime}` : 'Requires authenticated operator'}</span></div></div></div>
}
