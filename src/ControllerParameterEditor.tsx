import { useState } from 'react'
import { Download, SlidersHorizontal } from 'lucide-react'

type Parameters = {
  application: 'VAV' | 'FPB'
  occupiedCooling: number
  occupiedHeating: number
  unoccupiedCooling: number
  unoccupiedHeating: number
  deadband: number
  humidityHighLimit: number
  temperatureOffset: number
  humidityOffset: number
  coolingFlowMin: number
  coolingFlowMax: number
  heatingFlowMin: number
  heatingFlowMax: number
  flowPickupFactor: number
  flowZeroOffset: number
  actuatorSignal: '0-10 V' | '2-10 V' | 'Floating'
  damperStrokeSeconds: number
  damperFailPosition: 'Closed' | 'Open' | 'Last position'
  fanArrangement: 'None' | 'Parallel' | 'Series'
  fanStartFlow: number
  fanOffDelaySeconds: number
  fanProofRequired: boolean
  reheatType: 'None' | 'Hot water' | 'Electric'
  reheatStages: number
  dischargeTempLimit: number
  proportionalBand: number
  integralTimeSeconds: number
}

const initial: Parameters = {
  application: 'VAV', occupiedCooling: 22, occupiedHeating: 20, unoccupiedCooling: 28, unoccupiedHeating: 16,
  deadband: 1.5, humidityHighLimit: 65, temperatureOffset: 0, humidityOffset: 0,
  coolingFlowMin: 150, coolingFlowMax: 600, heatingFlowMin: 100, heatingFlowMax: 450,
  flowPickupFactor: 1, flowZeroOffset: 0, actuatorSignal: '0-10 V', damperStrokeSeconds: 90,
  damperFailPosition: 'Closed', fanArrangement: 'None', fanStartFlow: 70, fanOffDelaySeconds: 30,
  fanProofRequired: true, reheatType: 'Hot water', reheatStages: 1, dischargeTempLimit: 35,
  proportionalBand: 2, integralTimeSeconds: 300,
}

function NumberField({ label, value, unit, min, max, step = 1, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (value: number) => void
}) {
  return <label className="parameter-field"><span>{label}</span><div><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /><small>{unit}</small></div></label>
}

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly T[]; onChange: (value: T) => void
}) {
  return <label className="parameter-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

export default function ControllerParameterEditor() {
  const [parameters, setParameters] = useState<Parameters>(initial)
  const [notice, setNotice] = useState('Profile values are not yet mapped to controller-specific BACnet points.')
  const update = <K extends keyof Parameters>(key: K, value: Parameters[K]) => setParameters((current) => ({ ...current, [key]: value }))
  const flowInvalid = parameters.coolingFlowMin > parameters.coolingFlowMax || parameters.heatingFlowMin > parameters.heatingFlowMax
  const exportProfile = () => {
    if (flowInvalid) { setNotice('Correct the airflow minimum/maximum ranges before exporting.'); return }
    const profile = { schema: 'autofvmc-controller-profile/v1', ...parameters }
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${parameters.application.toLowerCase()}-controller-profile.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('Engineering profile exported. Confirm each parameter against the target model and point map.')
  }

  return <section className="panel parameter-panel">
    <header className="parameter-heading"><div><span className="panel-kicker"><SlidersHorizontal size={11} /> ADVANCED CONFIGURATION</span><h3>Controller parameters</h3><p>VAV and FPB tuning profile with engineering range checks.</p></div><button className="quiet-button" onClick={exportProfile}><Download size={14} /> Export profile</button></header>
    <div className="parameter-topline"><label className="parameter-field application-field"><span>Application</span><select value={parameters.application} onChange={(event) => { const application = event.target.value as Parameters['application']; update('application', application); if (application === 'FPB' && parameters.fanArrangement === 'None') update('fanArrangement', 'Parallel'); if (application === 'VAV') update('fanArrangement', 'None') }}><option value="VAV">VAV</option><option value="FPB">Fan-powered box</option></select></label><span className="parameter-notice">{notice}</span></div>
    <div className="parameter-groups">
      <details open><summary>Zone and humidity setpoints</summary><div className="parameter-grid">
        <NumberField label="Occupied cooling" value={parameters.occupiedCooling} unit="°C" min={10} max={35} step={0.5} onChange={(value) => update('occupiedCooling', value)} />
        <NumberField label="Occupied heating" value={parameters.occupiedHeating} unit="°C" min={10} max={35} step={0.5} onChange={(value) => update('occupiedHeating', value)} />
        <NumberField label="Unoccupied cooling" value={parameters.unoccupiedCooling} unit="°C" min={10} max={40} step={0.5} onChange={(value) => update('unoccupiedCooling', value)} />
        <NumberField label="Unoccupied heating" value={parameters.unoccupiedHeating} unit="°C" min={5} max={30} step={0.5} onChange={(value) => update('unoccupiedHeating', value)} />
        <NumberField label="Heating/cooling deadband" value={parameters.deadband} unit="°C" min={0.5} max={10} step={0.5} onChange={(value) => update('deadband', value)} />
        <NumberField label="Humidity high limit" value={parameters.humidityHighLimit} unit="%RH" min={20} max={90} onChange={(value) => update('humidityHighLimit', value)} />
        <NumberField label="Temperature offset" value={parameters.temperatureOffset} unit="°C" min={-5} max={5} step={0.1} onChange={(value) => update('temperatureOffset', value)} />
        <NumberField label="Humidity offset" value={parameters.humidityOffset} unit="%RH" min={-20} max={20} step={0.5} onChange={(value) => update('humidityOffset', value)} />
      </div></details>
      <details open><summary>Airflow and actuator tuning</summary><div className="parameter-grid">
        <NumberField label="Cooling min flow" value={parameters.coolingFlowMin} unit="cfm" min={50} max={1000} step={5} onChange={(value) => update('coolingFlowMin', value)} />
        <NumberField label="Cooling max flow" value={parameters.coolingFlowMax} unit="cfm" min={100} max={1500} step={5} onChange={(value) => update('coolingFlowMax', value)} />
        <NumberField label="Heating min flow" value={parameters.heatingFlowMin} unit="cfm" min={20} max={800} step={5} onChange={(value) => update('heatingFlowMin', value)} />
        <NumberField label="Heating max flow" value={parameters.heatingFlowMax} unit="cfm" min={50} max={1200} step={5} onChange={(value) => update('heatingFlowMax', value)} />
        <NumberField label="Flow pickup factor" value={parameters.flowPickupFactor} unit="x" min={0.5} max={3} step={0.1} onChange={(value) => update('flowPickupFactor', value)} />
        <NumberField label="Flow zero offset" value={parameters.flowZeroOffset} unit="cfm" min={-50} max={50} onChange={(value) => update('flowZeroOffset', value)} />
        <SelectField label="Actuator signal" value={parameters.actuatorSignal} options={['0-10 V', '2-10 V', 'Floating']} onChange={(value) => update('actuatorSignal', value)} />
        <NumberField label="Damper stroke" value={parameters.damperStrokeSeconds} unit="s" min={20} max={240} step={5} onChange={(value) => update('damperStrokeSeconds', value)} />
        <SelectField label="Damper fail position" value={parameters.damperFailPosition} options={['Closed', 'Open', 'Last position']} onChange={(value) => update('damperFailPosition', value)} />
        <SelectField label="Fan arrangement" value={parameters.fanArrangement} options={['None', 'Parallel', 'Series']} onChange={(value) => update('fanArrangement', value)} />
        <NumberField label="Fan start flow" value={parameters.fanStartFlow} unit="cfm" min={0} max={800} step={5} onChange={(value) => update('fanStartFlow', value)} />
        <NumberField label="Fan off delay" value={parameters.fanOffDelaySeconds} unit="s" min={0} max={300} step={5} onChange={(value) => update('fanOffDelaySeconds', value)} />
      </div></details>
      <details><summary>Reheat and control loop</summary><div className="parameter-grid">
        <SelectField label="Reheat type" value={parameters.reheatType} options={['None', 'Hot water', 'Electric']} onChange={(value) => update('reheatType', value)} />
        <NumberField label="Reheat stages" value={parameters.reheatStages} unit="stages" min={0} max={8} onChange={(value) => update('reheatStages', value)} />
        <NumberField label="Discharge temperature limit" value={parameters.dischargeTempLimit} unit="°C" min={20} max={60} onChange={(value) => update('dischargeTempLimit', value)} />
        <NumberField label="Proportional band" value={parameters.proportionalBand} unit="°C" min={0.5} max={10} step={0.5} onChange={(value) => update('proportionalBand', value)} />
        <NumberField label="Integral time" value={parameters.integralTimeSeconds} unit="s" min={30} max={1200} step={10} onChange={(value) => update('integralTimeSeconds', value)} />
        <label className="parameter-check"><input type="checkbox" checked={parameters.fanProofRequired} onChange={(event) => update('fanProofRequired', event.target.checked)} /><span>Fan proof required</span></label>
        {flowInvalid && <p className="parameter-error">Flow minimum values must not exceed maximum values.</p>}
      </div></details>
    </div>
  </section>
}