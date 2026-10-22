import { FormEvent, useState } from 'react'
import { ArrowRight, BadgeCheck, LockKeyhole, UserRound } from 'lucide-react'

type AccessGateProps = { onAuthenticated: (employeeNumber: string) => void }

export default function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = employeeNumber.trim().toUpperCase()
    if (!/^[A-Z0-9-]{4,20}$/.test(normalized)) {
      setError('Enter a valid Mc Dean employee number.')
      return
    }
    onAuthenticated(normalized)
  }

  return <main className="access-shell"><div className="access-card"><div className="access-brand"><div className="brand-mark"><BadgeCheck size={20} /></div><span>AutoFVMC AI</span></div><div className="access-icon"><LockKeyhole size={22} /></div><p className="eyebrow">CONTROL CONSOLE ACCESS</p><h1>Identify yourself before configuration</h1><p className="access-copy">Your employee number is attached to discovery, commissioning, and every approved controller write.</p><form onSubmit={submit}><label htmlFor="employee-number">Mc Dean employee number</label><div className="employee-input"><UserRound size={17} /><input id="employee-number" value={employeeNumber} onChange={(event) => { setEmployeeNumber(event.target.value); setError('') }} placeholder="e.g. MD-1042" autoComplete="off" autoFocus /></div>{error && <span className="access-error">{error}</span>}<button className="access-button" type="submit">Enter commissioning console <ArrowRight size={16} /></button></form><div className="access-note">Access events are recorded locally in this prototype. Connect this gate to Mc Dean SSO or the employee directory before production use.</div></div></main>
}
