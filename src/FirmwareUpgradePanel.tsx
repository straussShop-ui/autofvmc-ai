import { useState } from 'react'
import { Archive, CheckCircle2, Cpu, FileUp, LockKeyhole, UploadCloud } from 'lucide-react'

type FirmwareUpgradePanelProps = { employeeNumber: string }

export default function FirmwareUpgradePanel({ employeeNumber }: FirmwareUpgradePanelProps) {
  const [fileName, setFileName] = useState('')
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [approvalConfirmed, setApprovalConfirmed] = useState(false)
  const [status, setStatus] = useState('No firmware package staged')

  const stageFirmware = (file: File) => {
    setFileName(file.name)
    setStatus(file.name.toLowerCase().endsWith('.bin') || file.name.toLowerCase().endsWith('.hex') ? 'Package staged for compatibility check' : 'Review package format before continuing')
  }

  const requestUpgrade = () => {
    setStatus(`Upgrade request recorded for ${employeeNumber}. Vendor firmware adapter approval is required.`)
  }

  const ready = Boolean(fileName && backupConfirmed && approvalConfirmed && status.includes('compatibility'))
  return <div className="panel firmware-panel"><div className="panel-header"><div><span className="panel-kicker"><Cpu size={11} /> CONTROLLER FIRMWARE</span><h3>Firmware upgrade</h3><p>Stage a vendor package without mixing firmware changes into a point download.</p></div><LockKeyhole size={18} /></div><label className="firmware-drop"><FileUp size={20} /><strong>{fileName || 'Select a signed firmware package'}</strong><span>Supported staging formats: .bin or .hex</span><input type="file" accept=".bin,.hex,application/octet-stream" onChange={(event) => event.target.files?.[0] && stageFirmware(event.target.files[0])} /></label><div className="firmware-checks"><label><input type="checkbox" checked={backupConfirmed} onChange={(event) => setBackupConfirmed(event.target.checked)} /><Archive size={14} /> I exported the current controller configuration</label><label><input type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} /><CheckCircle2 size={14} /> I confirmed the package matches the target model and approved the maintenance window</label></div><div className="firmware-footer"><span>{status}</span><button className="outline-button" disabled={!ready} onClick={requestUpgrade}><UploadCloud size={14} /> Request firmware upgrade</button></div></div>
}
