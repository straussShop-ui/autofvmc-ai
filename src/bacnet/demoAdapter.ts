import type { BacnetDevice, BacnetDiscoveryAdapter, NetworkAdapter } from './types'

export class DemoBacnetDiscoveryAdapter implements BacnetDiscoveryAdapter {
  async discover(adapter: NetworkAdapter): Promise<BacnetDevice[]> {
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    return [{
      vendor: 'iSMA CONTROLLI',
      model: 'QTQP',
      name: 'VAV-14',
      instance: 14021,
      address: adapter.transport === 'BACnet/IP' ? '192.168.10.42' : 'MAC 14',
      transport: adapter.transport,
      reachable: true,
    }]
  }
}
