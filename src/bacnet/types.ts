export type BacnetTransport = 'BACnet/IP' | 'MS/TP'
export type BacnetObjectType = 'analog-input' | 'analog-output' | 'analog-value' | 'binary-input' | 'binary-output' | 'binary-value'

export type BacnetDevice = {
  vendor: string
  model: string
  name: string
  instance: number
  address: string
  transport: BacnetTransport
  reachable: boolean
}

export type BacnetPoint = {
  key: string
  label: string
  objectType: BacnetObjectType
  instance: number
  unit?: string
  writable: boolean
}

export type PointMap = Record<string, BacnetPoint>

export type NetworkAdapter = {
  name: string
  address: string
  subnetMask: string
  gateway?: string
  transport: BacnetTransport
}

export interface BacnetDiscoveryAdapter {
  discover(adapter: NetworkAdapter): Promise<BacnetDevice[]>
}

export interface BacnetPointAdapter {
  read(device: BacnetDevice, point: BacnetPoint): Promise<number | boolean>
  write(device: BacnetDevice, point: BacnetPoint, value: number | boolean, approvedBy: string): Promise<void>
}

export interface MsTpAdapter {
  connect(port: string, baudRate: number, macAddress: number): Promise<void>
  disconnect(): Promise<void>
}

export interface FirmwareAdapter {
  supports(vendor: string, model: string): Promise<boolean>
  backup(device: BacnetDevice): Promise<string>
  upgrade(device: BacnetDevice, packagePath: string, approvedBy: string): Promise<void>
  verify(device: BacnetDevice): Promise<{ firmware: string; healthy: boolean }>
}
