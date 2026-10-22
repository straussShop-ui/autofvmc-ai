import { useState } from 'react'
import { Bot, CheckCircle2, FileText, Send, ShieldCheck, Upload } from 'lucide-react'

type ProcedureAssistantPanelProps = { employeeNumber: string }
type Interpretation = { aiConfigured: boolean; sourceTextLength: number; steps: string[]; warnings: string[]; changes: Array<{ objectType: number; objectInstance: number; propertyId: number; value: number; applicationTag?: number }> }
const gatewayUrl = (import.meta.env.VITE_AUTOFVMC_GATEWAY_URL || '').replace(/\/$/, '')

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(new Error('Could not read PDF')); reader.readAsDataURL(file) })
}

export default function ProcedureAssistantPanel({ employeeNumber }: ProcedureAssistantPanelProps) {
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null)
  const [fileName, setFileName] = useState('')
  const [working, setWorking] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [jobId, setJobId] = useState('')
  const [status, setStatus] = useState('Upload the English programming procedure for AI review.')

  const uploadPdf = async (file: File) => {
    setFileName(file.name); setInterpretation(null); setConfirmed(false); setWorking(true); setStatus('Reading procedure and preparing an engineering plan...')
    try { const pdfBase64 = await toBase64(file); const response = await fetch(`${gatewayUrl}/api/interpret-pdf`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pdfBase64, fileName: file.name }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Procedure interpretation failed'); setInterpretation(result); setStatus(result.aiConfigured ? 'AI interpretation ready for confirmation.' : 'Text extracted, but AI is not configured on the gateway.') } catch (error) { setStatus(error instanceof Error ? error.message : 'Procedure interpretation failed') } finally { setWorking(false) }
  }

  const confirmAndWrite = async () => {
    if (!interpretation || !confirmed || !jobId.trim() || interpretation.changes.length === 0) return
    setWorking(true); setStatus('Sending confirmed mapped changes to the BACnet gateway...')
    try { const response = await fetch(`${gatewayUrl}/api/write-sequence`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approvedBy: employeeNumber, jobId: jobId.trim(), targetAddress: '192.168.10.42', interfaceAddress: '192.168.10.18', procedureName: fileName, device: { name: 'VAV-14', vendor: 'iSMA CONTROLLI', model: 'QTQP', instance: 14021, application: 'VAV', transport: 'BACnet/IP' }, changes: interpretation.changes }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Controller write failed'); setStatus(`Completed ${result.written} acknowledged writes. InfraLink report ${result.infraLink?.delivery || 'queued'} (${result.infraLink?.reportId || 'ID unavailable'}).`) } catch (error) { setStatus(error instanceof Error ? error.message : 'Controller write failed') } finally { setWorking(false) }
  }

  return <div className="panel procedure-panel"><div className="panel-header"><div><span className="panel-kicker"><Bot size={11} /> AI PROCEDURE ASSISTANT</span><h3>Read an English programming procedure</h3><p>Upload the vendor or engineering PDF. AI proposes steps and mapped changes for review.</p></div><FileText size={18} /></div><label className="procedure-drop"><Upload size={20} /><strong>{fileName || 'Upload programming procedure PDF'}</strong><span>Text-based PDFs supported; scanned PDFs need OCR.</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => event.target.files?.[0] && uploadPdf(event.target.files[0])} /></label>{working && <p className="procedure-status">{status}</p>}{interpretation && <div className="interpretation-review"><div className="interpretation-meta"><span><CheckCircle2 size={14} /> {interpretation.steps.length} steps extracted</span><span>{interpretation.changes.length} mapped writes</span><span>{interpretation.sourceTextLength} source characters</span></div><ol>{interpretation.steps.slice(0, 8).map((step) => <li key={step}>{step}</li>)}</ol>{interpretation.warnings.map((warning) => <p className="procedure-warning" key={warning}>{warning}</p>)}{interpretation.changes.length > 0 && <><label className="infralink-job-field">InfraLink job / work-order number<input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="Enter the active InfraLink job ID" required /></label><label className="procedure-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> <ShieldCheck size={14} /> I reviewed this AI-generated change set for the selected controller and approve the write as {employeeNumber}.</label><button className="primary-button" disabled={!confirmed || !jobId.trim() || working} onClick={confirmAndWrite}><Send size={14} /> Confirm and write to controller</button></>}</div>}<p className="procedure-status">{!working && status}</p></div>
}
