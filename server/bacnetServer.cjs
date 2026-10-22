const http = require('node:http')
const os = require('node:os')
const Bacnet = require('bacstack')
const pdfParse = require('pdf-parse')
const { recordAndDeliver, retryPendingReports } = require('./infraLinkReporter.cjs')
const { executeNetworkCommand } = require('./networkTools.cjs')

const PORT = Number(process.env.AUTOFVMC_PORT || 47880)
const HOST = process.env.AUTOFVMC_HOST || '127.0.0.1'
const BACNET_PORT = Number(process.env.BACNET_PORT || 47808)
const DISCOVERY_WINDOW_MS = 1800
const ALLOWED_ORIGINS = new Set((process.env.AUTOFVMC_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean))

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function networkAdapters() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, entries]) => (entries || []).filter((entry) => entry.family === 'IPv4' && !entry.internal).map((entry) => ({ name, address: entry.address, netmask: entry.netmask, mac: entry.mac })))
}

function requestBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('Invalid JSON body')) }
    })
    request.on('error', reject)
  })
}

function discover(interfaceAddress) {
  return new Promise((resolve, reject) => {
    const client = new Bacnet({ interface: interfaceAddress, port: BACNET_PORT, apduTimeout: 3000 })
    const devices = new Map()
    const onError = (error) => { client.close(); reject(error) }
    client.on('error', onError)
    client.on('iAm', (device) => devices.set(`${device.address}:${device.deviceId}`, { address: device.address, instance: device.deviceId, maxApdu: device.maxApdu, segmentation: device.segmentation, vendorId: device.vendorId, reachable: true }))
    client.whoIs()
    setTimeout(() => { client.removeListener('error', onError); client.close(); resolve([...devices.values()]) }, DISCOVERY_WINDOW_MS)
  })
}

function readProperty(body) {
  return new Promise((resolve, reject) => {
    const client = new Bacnet({ interface: body.interfaceAddress, port: BACNET_PORT, apduTimeout: 3000 })
    client.readProperty(body.address, { type: Number(body.objectType), instance: Number(body.objectInstance) }, Number(body.propertyId), (error, value) => {
      client.close()
      if (error) reject(error)
      else resolve(value)
    })
  })
}

function writeProperty(body) {
  if (process.env.ALLOW_LIVE_WRITES !== 'true') throw new Error('Live writes are disabled. Set ALLOW_LIVE_WRITES=true after hardware validation.')
  if (!body.approvedBy || !String(body.approvedBy).trim()) throw new Error('approvedBy is required for every live write.')
  return new Promise((resolve, reject) => {
    const client = new Bacnet({ interface: body.interfaceAddress, port: BACNET_PORT, apduTimeout: 3000 })
    const values = [{ type: Number(body.applicationTag || Bacnet.enum.ApplicationTags.REAL), value: body.value }]
    client.writeProperty(body.address, { type: Number(body.objectType), instance: Number(body.objectInstance) }, Number(body.propertyId), values, { priority: Number(body.priority || 16) }, (error) => {
      client.close()
      if (error) reject(error)
      else resolve({ written: true, approvedBy: body.approvedBy })
    })
  })
}

async function interpretPdf(body) {
  if (!body.pdfBase64) throw new Error('pdfBase64 is required.')
  const parsed = await pdfParse(Buffer.from(body.pdfBase64, 'base64'))
  const text = parsed.text.trim()
  if (!text) throw new Error('The PDF did not contain readable text. OCR is required for scanned PDFs.')
  if (!process.env.OPENAI_API_KEY) return { aiConfigured: false, sourceTextLength: text.length, steps: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 40), warnings: ['AI service is not configured on this gateway. No controller changes were generated.'], changes: [] }
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: [{ role: 'system', content: 'Convert HVAC controller programming procedures into JSON. Never invent BACnet object identifiers. Return only JSON with steps: string[], warnings: string[], changes: [{objectType, objectInstance, propertyId, value, applicationTag}]. Keep changes empty when exact writable BACnet mappings are not stated.' }, { role: 'user', content: text.slice(0, 120000) }], text: { format: { type: 'json_object' } } }) })
  if (!response.ok) throw new Error(`AI interpretation failed with HTTP ${response.status}.`)
  const result = await response.json()
  const output = result.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
  if (!output) throw new Error('AI returned no structured procedure.')
  return { ...JSON.parse(output), sourceTextLength: text.length, aiConfigured: true }
}

async function troubleshoot(body) {
  if (!process.env.OPENAI_API_KEY) throw new Error('AI troubleshooting is not configured on the gateway. Set OPENAI_API_KEY there.')
  if (!body.employeeNumber || !String(body.employeeNumber).trim()) throw new Error('An employee number is required to start a troubleshooting session.')
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20) throw new Error('Send between 1 and 20 troubleshooting messages.')
  const messages = body.messages.map((message) => {
    if (!['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || message.content.length > 6000) throw new Error('Invalid or oversized chat message.')
    return { role: message.role, content: message.content }
  })
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: [{ role: 'system', content: 'You are AutoFVMC Field Assist, a cautious HVAC controls and industrial automation troubleshooting assistant. Cover HVAC control sequences, sensors, actuators, electrical control circuits, Ethernet/IP networking, BACnet/IP, BACnet MS/TP, Modbus TCP/RTU, serial settings, and related automation protocols. Ask focused clarifying questions when topology, device model, wiring, or measurements are missing. Give numbered, practical diagnostic steps, expected observations, and what each result implies. Distinguish confirmed facts from hypotheses. Never instruct users to work on energized exposed electrical equipment; advise qualified personnel and site lockout/tagout and electrical safety procedures. Never invent vendor-specific points, register addresses, baud rates, or firmware procedures. You are advisory only: do not issue controller writes, change IPs, or run commands. Require human approval and manufacturer documentation for changes. If a fault suggests immediate danger, tell the user to stop and follow site emergency procedures.' }, ...messages], max_output_tokens: 900 }) })
  if (!response.ok) throw new Error(`Troubleshooting assistant failed with HTTP ${response.status}.`)
  const result = await response.json()
  const answer = result.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text
  if (!answer) throw new Error('Troubleshooting assistant returned an empty reply.')
  return { answer, employeeNumber: String(body.employeeNumber).trim(), advisoryOnly: true }
}

async function writeSequence(body) {
  if (!body.approvedBy || !body.jobId || !body.targetAddress || !Array.isArray(body.changes) || body.changes.length === 0) throw new Error('A confirmed operator, InfraLink job ID, target address, and explicit mapped changes are required.')
  const results = []
  for (const change of body.changes) results.push(await writeProperty({ ...change, address: body.targetAddress, interfaceAddress: body.interfaceAddress, approvedBy: body.approvedBy }))
  let infraLink
  try {
    infraLink = await recordAndDeliver({ ...body, writeResults: results })
  } catch (error) {
    infraLink = { delivery: 'recording_error', message: error instanceof Error ? error.message : String(error) }
  }
  return { written: results.length, approvedBy: body.approvedBy, targetAddress: body.targetAddress, infraLink }
}

const server = http.createServer(async (request, response) => {
  try {
    const origin = request.headers.origin
    if (origin) {
      if (!ALLOWED_ORIGINS.has(origin)) return json(response, 403, { error: 'This web origin is not authorized to use the gateway.' })
      response.setHeader('access-control-allow-origin', origin)
      response.setHeader('vary', 'Origin')
      response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
      response.setHeader('access-control-allow-headers', 'content-type, authorization')
      if (request.method === 'OPTIONS') { response.writeHead(204); return response.end() }
    }
    const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`)
    if (request.method === 'GET' && url.pathname === '/api/network') return json(response, 200, { adapters: networkAdapters() })
    if (request.method === 'POST' && url.pathname === '/api/network/command') { const body = await requestBody(request); return json(response, 200, await executeNetworkCommand(body.command, body.employeeNumber)) }
    if (request.method === 'POST' && url.pathname === '/api/discover') { const body = await requestBody(request); return json(response, 200, { devices: await discover(body.interfaceAddress) }) }
    if (request.method === 'POST' && url.pathname === '/api/read-property') return json(response, 200, { value: await readProperty(await requestBody(request)) })
    if (request.method === 'POST' && url.pathname === '/api/write-property') return json(response, 200, await writeProperty(await requestBody(request)))
    if (request.method === 'POST' && url.pathname === '/api/interpret-pdf') return json(response, 200, await interpretPdf(await requestBody(request)))
    if (request.method === 'POST' && url.pathname === '/api/troubleshoot') return json(response, 200, await troubleshoot(await requestBody(request)))
    if (request.method === 'POST' && url.pathname === '/api/write-sequence') return json(response, 200, await writeSequence(await requestBody(request)))
    json(response, 404, { error: 'Not found' })
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(PORT, HOST, () => console.log(`AutoFVMC BACnet bridge listening on http://${HOST}:${PORT}`))
const infraLinkRetryTimer = setInterval(() => { retryPendingReports().catch((error) => console.error('InfraLink outbox retry failed:', error)) }, 60000)
infraLinkRetryTimer.unref()
