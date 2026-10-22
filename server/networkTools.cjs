const os = require('node:os')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const runFile = promisify(execFile)

function adapters() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, entries]) => (entries || []).filter((entry) => entry.family === 'IPv4' && !entry.internal).map((entry) => ({ name, address: entry.address, netmask: entry.netmask, mac: entry.mac })))
}

function isIPv4(value) {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

function ipNumber(value) {
  return value.split('.').reduce((total, part) => (total * 256 + Number(part)) >>> 0, 0)
}

function validMask(value) {
  if (!isIPv4(value)) return false
  const mask = ipNumber(value)
  const inverse = (~mask) >>> 0
  return ((inverse + 1) & inverse) === 0
}

function inSameSubnet(address, other, mask) {
  const maskValue = ipNumber(mask)
  return (ipNumber(address) & maskValue) === (ipNumber(other) & maskValue)
}

async function executeNetworkCommand(command, employeeNumber) {
  const value = String(command || '').trim()
  if (value === 'help') return { output: ['Supported commands:', '  help', '  ipconfig', '  ping <IPv4 address>', '  match-ip <controller IPv4 address>', '  configure-ip "<adapter name>" <IPv4> <subnet mask> <gateway IPv4|none> CONFIRM', '', 'Static IP changes affect the laptop adapter only and require ALLOW_HOST_IP_CHANGES=true on the gateway.'] }

  if (value === 'ipconfig') {
    const found = adapters()
    return { output: found.length ? found.map((adapter) => `${adapter.name}: ${adapter.address} / ${adapter.netmask}${adapter.mac ? ` · ${adapter.mac}` : ''}`) : ['No non-loopback IPv4 adapters found.'] }
  }

  const pingMatch = value.match(/^ping\s+(\d{1,3}(?:\.\d{1,3}){3})$/i)
  if (pingMatch) {
    const address = pingMatch[1]
    if (!isIPv4(address)) throw new Error('Ping accepts an IPv4 address only.')
    try {
      const { stdout } = await runFile('ping.exe', ['-n', '4', '-w', '1000', address], { timeout: 7000, windowsHide: true, maxBuffer: 16 * 1024 })
      return { output: stdout.trim().split(/\r?\n/), success: /Lost = 0/i.test(stdout) }
    } catch (error) {
      const output = String(error.stdout || error.stderr || error.message).trim().split(/\r?\n/)
      return { output, success: false }
    }
  }

  const matchIp = value.match(/^match-ip\s+(\d{1,3}(?:\.\d{1,3}){3})$/i)
  if (matchIp) {
    const target = matchIp[1]
    if (!isIPv4(target)) throw new Error('match-ip accepts an IPv4 address only.')
    const found = adapters().map((adapter) => ({ ...adapter, matches: inSameSubnet(adapter.address, target, adapter.netmask) }))
    return { output: found.length ? found.map((adapter) => `${adapter.name}: ${adapter.address}/${adapter.netmask} → ${target}: ${adapter.matches ? 'same subnet' : 'different subnet'}`) : ['No non-loopback IPv4 adapters found.'] }
  }

  const setIpMatch = value.match(/^configure-ip\s+"([^"]{1,80})"\s+(\d{1,3}(?:\.\d{1,3}){3})\s+(\d{1,3}(?:\.\d{1,3}){3})\s+(\d{1,3}(?:\.\d{1,3}){3}|none)\s+CONFIRM$/i)
  if (setIpMatch) {
    if (process.env.ALLOW_HOST_IP_CHANGES !== 'true') throw new Error('Static IP changes are disabled. An administrator must enable ALLOW_HOST_IP_CHANGES=true on the local gateway.')
    if (!employeeNumber || !String(employeeNumber).trim()) throw new Error('Operator identification is required.')
    if (process.platform !== 'win32') throw new Error('Laptop IP configuration is currently supported on Windows only.')
    const [, adapterName, address, mask, gateway] = setIpMatch
    if (!isIPv4(address) || !validMask(mask) || (gateway.toLowerCase() !== 'none' && !isIPv4(gateway))) throw new Error('Enter valid IPv4, contiguous subnet mask, and gateway values.')
    const available = adapters().some((adapter) => adapter.name === adapterName)
    if (!available) throw new Error('Adapter name was not found. Run ipconfig and use an exact listed adapter name.')
    if (gateway.toLowerCase() !== 'none' && !inSameSubnet(address, gateway, mask)) throw new Error('Gateway must be in the configured laptop subnet.')
    const args = ['interface', 'ipv4', 'set', 'address', `name=${adapterName}`, 'source=static', `address=${address}`, `mask=${mask}`, `gateway=${gateway.toLowerCase() === 'none' ? 'none' : gateway}`]
    const { stdout, stderr } = await runFile('netsh.exe', args, { timeout: 10000, windowsHide: true, maxBuffer: 16 * 1024 })
    return { output: [stdout.trim() || stderr.trim() || `Static IP configured on ${adapterName}.`, `Requested by operator ${employeeNumber}.`, 'The active web/gateway session may disconnect. Run ipconfig and match-ip to verify.'], success: true }
  }

  throw new Error('Command not recognized. Type help to see the supported network commands.')
}

module.exports = { executeNetworkCommand }
