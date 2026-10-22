import { FormEvent, useState } from 'react'
import { Bot, ChevronDown, CircleHelp, FileCheck2, LoaderCircle, MessageCircle, Network, Send, ShieldAlert, Wrench } from 'lucide-react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const programmingSteps = [
  ['Connect', 'Connect the engineering computer to the BACnet/IP network over RJ45, or select the configured MS/TP adapter.'],
  ['Discover', 'Select the active network adapter and run BACnet Who-Is discovery. Confirm device instance, vendor, model, and reachable address.'],
  ['Identify', 'Choose VAV, FPB, or Custom application and confirm the discovered device profile. Never write to an unverified device.'],
  ['Map points', 'Auto-map BACnet object names where possible, then manually review every temperature, airflow, humidity, damper, fan, and reheat point.'],
  ['Upload sequence', 'Upload the approved engineering JSON sequence and review setpoints, airflow limits, actuator options, and humidity limits.'],
  ['Validate', 'Run range checks, required-point checks, writable-property checks, and a dry-run comparison against current controller values.'],
  ['Commission', 'Run sensor zero, damper response, airflow minimum/maximum, fan proving, and reheat tests. Record each result.'],
  ['Approve and write', 'The authenticated engineer reviews the change set, confirms the target device, and authorizes the validated download.'],
  ['Verify', 'Read the written values back, confirm controller status, trend the response, and export the commissioning record.'],
]

const ipSteps = [
  ['Check first', 'Record the current laptop IPv4 address, subnet mask, gateway, controller address, and BACnet UDP port before changing anything.'],
  ['Match the laptop', 'For a direct connection, set the laptop to an unused address in the controller subnet. Do not use the controller address or create a duplicate IP.'],
  ['Re-scan', 'Run network adapter detection and BACnet discovery again. A subnet match alone is not proof of BACnet communication.'],
  ['Controller address', 'Only change a controller IP through an approved device property or vendor-supported procedure. Confirm the new address is unused first.'],
  ['Reconnect', 'After an IP change, expect the session to drop. Update the selected device address, rediscover it, and verify device instance and firmware.'],
  ['Prove communication', 'Read a known device property, read a live sensor, and confirm round-trip latency before any configuration write.'],
]

function StepList({ steps }: { steps: string[][] }) {
  return <div className="help-steps">{steps.map(([title, detail], index) => <div className="help-step" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div>
}

export default function HelpCenterPanel({ employeeNumber }: { employeeNumber: string }) {
  const [section, setSection] = useState<'chat' | 'programming' | 'network'>('chat')
  const gateway = (import.meta.env.VITE_AUTOFVMC_GATEWAY_URL || '').replace(/\/$/, '')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: gateway
        ? 'Tell me what you are troubleshooting. Include the controller model, protocol, symptoms, and any measured values or error codes. I can help with HVAC controls, electrical control circuits, Ethernet/IP, BACnet/IP, BACnet MS/TP, and Modbus TCP/RTU.'
        : 'The protected gateway is not configured yet. Set VITE_AUTOFVMC_GATEWAY_URL to your approved internal gateway before using the live troubleshooting assistant.'
    }
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [chatError, setChatError] = useState('')

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    if (!gateway) {
      setChatError('The protected gateway is not configured. Set VITE_AUTOFVMC_GATEWAY_URL to the internal AutoFVMC gateway before using the live troubleshooting assistant.')
      return
    }
    const updatedMessages = [...messages, { role: 'user' as const, content }]
    setMessages(updatedMessages)
    setDraft('')
    setBusy(true)
    setChatError('')
    try {
      const response = await fetch(`${gateway}/api/troubleshoot`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ employeeNumber, messages: updatedMessages.slice(-12) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to reach the troubleshooting assistant.')
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unable to reach the troubleshooting assistant.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="panel help-panel"><div className="help-heading"><div><span className="panel-kicker"><CircleHelp size={11} /> HELP CENTER</span><h3>Field setup and troubleshooting</h3><p>Protocol-aware diagnostic guidance. Advice only; no controller changes are executed by chat.</p></div><Wrench size={18} /></div><div className="help-tabs"><button className={section === 'chat' ? 'selected' : ''} onClick={() => setSection('chat')}><MessageCircle size={14} /> Diagnostic assistant</button><button className={section === 'programming' ? 'selected' : ''} onClick={() => setSection('programming')}><FileCheck2 size={14} /> Programming setup</button><button className={section === 'network' ? 'selected' : ''} onClick={() => setSection('network')}><Network size={14} /> IP reconfiguration</button></div>{section === 'chat' ? <div className="help-chat"><div className="chat-scope">HVAC controls · electrical · Ethernet/IP · BACnet/IP · MS/TP · Modbus</div>{!gateway && <div className="chat-error">Protected gateway not configured. Add VITE_AUTOFVMC_GATEWAY_URL before using the live AI assistant.</div>}<div className="chat-transcript" aria-live="polite">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-avatar">{message.role === 'assistant' ? <Bot size={14} /> : employeeNumber.slice(0, 2)}</span><p>{message.content}</p></div>)}{busy && <div className="chat-working"><LoaderCircle size={14} className="spin" /> Preparing diagnostic steps...</div>}</div>{chatError && <div className="chat-error">{chatError}</div>}<form className="chat-compose" onSubmit={sendMessage}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe the symptom, device, protocol, LEDs, readings, or error..." rows={2} disabled={busy || !gateway} /><button className="primary-button" disabled={busy || !draft.trim() || !gateway} aria-label="Send troubleshooting question"><Send size={15} /> Ask</button></form><p className="chat-safety">For electrical hazards, stop work and follow site isolation and lockout/tagout procedures. Verify all advice against the device manual.</p></div> : section === 'programming' ? <StepList steps={programmingSteps} /> : <><div className="help-warning"><ShieldAlert size={16} /><span>Changing a controller IP can disconnect the session. Export the current settings and confirm the replacement address is unused before applying it.</span></div><StepList steps={ipSteps} /></>}<details className="help-details"><summary>Before any live write <ChevronDown size={14} /></summary><p>Confirm employee identity, target device, point map, engineering approval, and read-back plan. The troubleshooting assistant is advisory only and cannot make live controller changes.</p></details></div>
}
