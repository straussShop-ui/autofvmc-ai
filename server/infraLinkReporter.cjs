const fs = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

const OUTBOX_PATH = process.env.AUTOFVMC_INFRALINK_OUTBOX || path.join(__dirname, 'data', 'infralink-outbox.jsonl')
let retryInProgress = false

async function appendOutbox(record) {
  await fs.mkdir(path.dirname(OUTBOX_PATH), { recursive: true })
  await fs.appendFile(OUTBOX_PATH, `${JSON.stringify(record)}\n`, 'utf8')
}

async function deliver(report) {
  const endpoint = process.env.AUTOFVMC_INFRALINK_WEBHOOK_URL
  if (!endpoint) return { reportId: report.reportId, delivery: 'queued', message: 'InfraLink endpoint is not configured; report saved to the local outbox.' }

  let url
  try {
    url = new URL(endpoint)
  } catch {
    return { reportId: report.reportId, delivery: 'queued', message: 'InfraLink endpoint is invalid; report remains in the outbox.' }
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return { reportId: report.reportId, delivery: 'queued', message: 'InfraLink webhook must use HTTPS except for localhost development; report remains in the outbox.' }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': report.reportId,
        ...(process.env.AUTOFVMC_INFRALINK_TOKEN ? { authorization: `Bearer ${process.env.AUTOFVMC_INFRALINK_TOKEN}` } : {}),
      },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return { reportId: report.reportId, delivery: 'queued', message: `InfraLink returned HTTP ${response.status}; report remains in the outbox.` }
    return { reportId: report.reportId, delivery: 'delivered', message: 'InfraLink accepted the completion report.' }
  } catch (error) {
    return { reportId: report.reportId, delivery: 'queued', message: `InfraLink is unavailable; report remains in the outbox. ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function recordDelivery(result) {
  await appendOutbox({ eventType: 'infralink_delivery_attempt', reportId: result.reportId, attemptedAt: new Date().toISOString(), delivery: result.delivery, message: result.message })
}

async function recordAndDeliver(input) {
  const report = {
    reportId: randomUUID(),
    eventType: 'controller_programming_write_acknowledged',
    reportedAt: new Date().toISOString(),
    jobId: input.jobId,
    organization: input.organization || 'Mc Dean',
    employeeNumber: input.approvedBy,
    device: {
      name: input.device?.name || 'Unspecified controller',
      vendor: input.device?.vendor || 'Unknown',
      model: input.device?.model || 'Unknown',
      instance: input.device?.instance ?? null,
      address: input.targetAddress,
      application: input.device?.application || 'Unspecified',
      transport: input.device?.transport || 'BACnet/IP',
    },
    procedure: { fileName: input.procedureName || null, changeCount: input.changes.length },
    changes: input.changes.map(({ objectType, objectInstance, propertyId, value, applicationTag }) => ({ objectType, objectInstance, propertyId, value, applicationTag: applicationTag ?? null })),
    result: { writeAcknowledgements: input.writeResults.length, verification: 'readback_not_implemented' },
    delivery: 'queued',
  }

  await appendOutbox(report)
  const result = await deliver(report)
  try { await recordDelivery(result) } catch (error) { result.message += ` Delivery status could not be appended to outbox: ${error instanceof Error ? error.message : String(error)}` }
  return result
}

async function retryPendingReports() {
  if (retryInProgress || !process.env.AUTOFVMC_INFRALINK_WEBHOOK_URL) return
  retryInProgress = true
  try {
    const lines = await fs.readFile(OUTBOX_PATH, 'utf8').catch((error) => error.code === 'ENOENT' ? '' : Promise.reject(error))
    const reports = new Map()
    const deliveryStates = new Map()
    for (const line of lines.split(/\r?\n/).filter(Boolean)) {
      try {
        const record = JSON.parse(line)
        if (record.eventType === 'infralink_delivery_attempt') deliveryStates.set(record.reportId, record.delivery)
        else if (record.reportId && record.eventType === 'controller_programming_write_acknowledged') reports.set(record.reportId, record)
      } catch { /* Ignore malformed legacy outbox rows and continue processing valid reports. */ }
    }
    for (const report of reports.values()) {
      if ((deliveryStates.get(report.reportId) || report.delivery) !== 'queued') continue
      const result = await deliver(report)
      try { await recordDelivery(result) } catch (error) { console.error('Failed to record InfraLink delivery status:', error) }
    }
  } finally {
    retryInProgress = false
  }
}

module.exports = { recordAndDeliver, retryPendingReports }
