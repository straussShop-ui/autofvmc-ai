import { FormEvent, useState } from 'react'
import { ChevronRight, Command, LoaderCircle, Play, ShieldCheck } from 'lucide-react'

type Result = { command: string; output: string[]; success?: boolean }
const gatewayUrl = (import.meta.env.VITE_AUTOFVMC_GATEWAY_URL || '').replace(/\/$/, '')
const examples = ['ipconfig', 'ping 192.168.1.10', 'match-ip 192.168.1.10']

export default function NetworkCliPanel({ employeeNumber }: { employeeNumber: string }) {
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<Result[]>([{ command: 'help', output: ['Network diagnostic console ready.', 'Commands: help · ipconfig · ping <IPv4> · match-ip <controller IPv4>', 'Static configuration: configure-ip "<adapter>" <IPv4> <mask> <gateway|none> CONFIRM'] }])

  const run = async (event: FormEvent) => {
    event.preventDefault()
    const submitted = command.trim()
    if (!submitted || busy) return
    setBusy(true)
    setCommand('')
    try {
      const response = await fetch(`${gatewayUrl}/api/network/command`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command: submitted, employeeNumber }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Network command failed.')
      setHistory((items) => [...items, { command: submitted, output: result.output || [], success: result.success }])
    } catch (error) {
      setHistory((items) => [...items, { command: submitted, output: [error instanceof Error ? error.message : 'Network gateway unavailable.'], success: false }])
    } finally {
      setBusy(false)
    }
  }

  return <section className="panel network-cli-panel"><header className="network-cli-heading"><div><span className="panel-kicker"><Command size={11} /> NETWORK CLI</span><h3>Ping and IP tools</h3><p>Restricted diagnostic commands run on the local gateway, not in the browser.</p></div><ShieldCheck size={18} /></header><div className="network-cli-examples">{examples.map((example) => <button type="button" key={example} onClick={() => setCommand(example)}>{example}</button>)}</div><div className="network-cli-output" aria-live="polite">{history.map((entry, index) => <div className="cli-entry" key={`${entry.command}-${index}`}><div className="cli-prompt"><ChevronRight size={13} /> {entry.command}</div><pre className={entry.success === false ? 'failed' : ''}>{entry.output.join('\n')}</pre></div>)}{busy && <div className="cli-running"><LoaderCircle size={13} className="spin" /> Running on gateway…</div>}</div><form className="network-cli-form" onSubmit={run}><span>›</span><input aria-label="Network command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Type help, ipconfig, ping 192.168.1.10…" disabled={busy} /><button className="primary-button" type="submit" disabled={busy || !command.trim()}><Play size={13} /> Run</button></form><p className="network-cli-warning">IP configuration only changes the laptop adapter. It is disabled by default and requires explicit CONFIRM plus gateway administrator approval. Controller IP changes are not supported by this CLI.</p></section>
}
