import type { DescribePath, HDWallet, PathDescription } from '@shapeshiftoss/hdwallet-core'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import type { TonConnectUI } from '@tonconnect/ui-react'

export type TonConnectAdapterArgs = {
  tonConnect: TonConnectUI
}

export class TonConnectHDWallet implements HDWallet {
  readonly _supportsTon = true
  readonly _supportsEthSwitchChain = false
  readonly _supportsAvalanche = false
  readonly _supportsOptimism = false
  readonly _supportsBSC = false
  readonly _supportsPolygon = false
  readonly _supportsGnosis = false
  readonly _supportsArbitrum = false
  readonly _supportsArbitrumNova = false
  readonly _supportsBase = false
  readonly _supportsBitcoin = false
  readonly _supportsBitcoinCash = false
  readonly _supportsCosmos = false
  readonly _supportsDogecoin = false
  readonly _supportsLitecoin = false
  readonly _supportsThorchain = false
  readonly _supportsHighbury = false

  private tonConnect: TonConnectUI

  constructor(tonConnect: TonConnectUI) {
    this.tonConnect = tonConnect
  }

  getFeatures(): Promise<Record<string, unknown>> {
    return Promise.resolve({})
  }

  getFirmwareVersion(): Promise<string> {
    return Promise.resolve('N/A')
  }

  getDeviceID(): Promise<string> {
    const wallet = this.tonConnect.wallet
    if (wallet && 'account' in wallet) {
      return Promise.resolve(`tonconnect:${wallet.account.address}`)
    }
    return Promise.resolve('tonconnect:unknown')
  }

  getVendor(): string {
    return 'TonConnect'
  }

  getModel(): Promise<string> {
    const wallet = this.tonConnect.wallet
    if (wallet && 'device' in wallet) {
      return Promise.resolve(wallet.device.appName || 'TON Wallet')
    }
    return Promise.resolve('TON Wallet')
  }

  getLabel(): Promise<string> {
    const wallet = this.tonConnect.wallet
    if (wallet && 'device' in wallet) {
      return Promise.resolve(wallet.device.appName || 'TON Connect Wallet')
    }
    return Promise.resolve('TON Connect Wallet')
  }

  getPublicKeys(): Promise<{ xpub: string }[]> {
    return Promise.resolve([])
  }

  isLocked(): Promise<boolean> {
    return Promise.resolve(!this.tonConnect.connected)
  }

  isInitialized(): Promise<boolean> {
    return Promise.resolve(this.tonConnect.connected)
  }

  initialize(): Promise<void> {
    return Promise.resolve()
  }

  async clearSession(): Promise<void> {
    await this.tonConnect.disconnect()
  }

  ping(msg: { msg: string }): Promise<{ msg: string }> {
    return Promise.resolve(msg)
  }

  sendPin(): Promise<void> {
    return Promise.resolve()
  }

  sendPassphrase(): Promise<void> {
    return Promise.resolve()
  }

  sendCharacter(): Promise<void> {
    return Promise.resolve()
  }

  sendWord(): Promise<void> {
    return Promise.resolve()
  }

  cancel(): Promise<void> {
    return Promise.resolve()
  }

  async wipe(): Promise<void> {
    await this.clearSession()
  }

  reset(): Promise<void> {
    return Promise.resolve()
  }

  recover(): Promise<void> {
    return Promise.resolve()
  }

  loadDevice(): Promise<void> {
    return Promise.resolve()
  }

  hasOnDevicePinEntry(): boolean {
    return false
  }

  hasOnDevicePassphrase(): boolean {
    return false
  }

  hasOnDeviceDisplay(): boolean {
    return false
  }

  hasOnDeviceRecovery(): boolean {
    return false
  }

  hasNativeShapeShift(): boolean {
    return false
  }

  supportsBip44Accounts(): boolean {
    return false
  }

  supportsOfflineSigning(): boolean {
    return true
  }

  supportsBroadcast(): boolean {
    return false
  }

  describePath(_msg: DescribePath): PathDescription {
    return {
      isKnown: false,
      verbose: 'TON Connect',
      coin: 'TON',
    }
  }

  disconnect(): Promise<void> {
    return this.clearSession()
  }

  tonGetAddress(_params: {
    addressNList: number[]
    showDisplay?: boolean
  }): Promise<string | null> {
    if (!this.tonConnect.connected || !this.tonConnect.wallet) {
      return Promise.resolve(null)
    }

    const wallet = this.tonConnect.wallet
    if ('account' in wallet) {
      return Promise.resolve(wallet.account.address)
    }

    return Promise.resolve(null)
  }

  async tonSignTx(params: {
    addressNList: number[]
    message: Uint8Array
    rawMessages?: unknown[]
    seqno: number
    expireAt: number
  }): Promise<{ serialized: string } | null> {
    if (!this.tonConnect.connected) {
      throw new Error('TonConnect wallet not connected')
    }

    const messageData = JSON.parse(new TextDecoder().decode(params.message))

    const transaction = {
      validUntil: params.expireAt,
      messages: [
        {
          address: messageData.to,
          amount: messageData.value,
          ...(messageData.memo ? { payload: messageData.memo } : {}),
        },
      ],
    }

    try {
      const result = await this.tonConnect.sendTransaction(transaction)
      return { serialized: result.boc }
    } catch (error) {
      console.error('[TonConnect] Transaction signing failed:', error)
      throw error
    }
  }
}

export class TonConnectAdapter {
  keyring: Keyring
  private tonConnect: TonConnectUI | null = null

  private constructor() {
    this.keyring = new Keyring()
  }

  static useKeyring(keyring: Keyring): TonConnectAdapter {
    const adapter = new TonConnectAdapter()
    adapter.keyring = keyring
    return adapter
  }

  setTonConnect(tonConnect: TonConnectUI): void {
    this.tonConnect = tonConnect
  }

  initialize(): Promise<number> {
    return Promise.resolve(0)
  }

  async pairDevice(): Promise<TonConnectHDWallet | null> {
    if (!this.tonConnect) {
      throw new Error('TonConnect not initialized. Call setTonConnect first.')
    }

    const tonConnectRef = this.tonConnect

    if (!this.tonConnect.connected) {
      await this.tonConnect.openModal()

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 300000)

        const unsubscribe = tonConnectRef.onStatusChange(wallet => {
          if (wallet) {
            clearTimeout(timeout)
            unsubscribe()
            resolve()
          }
        })
      })
    }

    const wallet = new TonConnectHDWallet(this.tonConnect)
    await wallet.initialize()

    const deviceId = await wallet.getDeviceID()
    this.keyring.add(wallet as unknown as HDWallet, deviceId)

    return wallet
  }
}
