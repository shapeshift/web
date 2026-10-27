import * as core from '@shapeshiftoss/hdwallet-core'
import isObject from 'lodash/isObject'
import { constants, validateAndParseAddress } from 'starknet'

import type {
  StarknetInjectedErrorCode,
  StarknetInjectedProviderId,
  StarknetWindowObject,
} from './types'

// `code` lets the app show a translated message without parsing error strings
export class StarknetInjectedError extends Error {
  readonly code: StarknetInjectedErrorCode

  constructor(code: StarknetInjectedErrorCode, message: string) {
    super(message)
    this.name = 'StarknetInjectedError'
    this.code = code
  }
}

export function isStarknetInjected(wallet: core.HDWallet): wallet is StarknetInjectedHDWallet {
  return isObject(wallet) && (wallet as any)._isStarknetInjected
}

export class StarknetInjectedHDWalletInfo implements core.HDWalletInfo, core.StarknetWalletInfo {
  readonly _supportsStarknetInfo = true

  vendor: string

  constructor(vendor: string) {
    this.vendor = vendor
  }

  public getVendor(): string {
    return this.vendor
  }

  public hasOnDevicePinEntry(): boolean {
    return false
  }

  public hasOnDevicePassphrase(): boolean {
    return true
  }

  public hasOnDeviceDisplay(): boolean {
    return true
  }

  public hasOnDeviceRecovery(): boolean {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public hasNativeShapeShift(_srcCoin: core.Coin, _dstCoin: core.Coin): boolean {
    return false
  }

  public supportsBip44Accounts(): boolean {
    return false
  }

  public supportsOfflineSigning(): boolean {
    return false
  }

  public supportsBroadcast(): boolean {
    return true
  }

  public describePath(msg: core.DescribePath): core.PathDescription {
    switch (msg.coin.toLowerCase()) {
      case 'starknet':
        return core.starknetDescribePath(msg.path)
      default:
        throw new Error('Unsupported path')
    }
  }

  public starknetGetAccountPaths(msg: core.StarknetGetAccountPaths): core.StarknetAccountPath[] {
    return core.starknetGetAccountPaths(msg)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public starknetNextAccountPath(
    _msg: core.StarknetAccountPath,
  ): core.StarknetAccountPath | undefined {
    throw new Error('Method not implemented')
  }
}

export class StarknetInjectedHDWallet
  extends StarknetInjectedHDWalletInfo
  implements core.HDWallet, core.StarknetWallet
{
  readonly _supportsStarknet = true
  readonly _isStarknetInjected = true

  providerId: StarknetInjectedProviderId
  provider: StarknetWindowObject

  starknetAddress?: string | null

  constructor(
    providerId: StarknetInjectedProviderId,
    provider: StarknetWindowObject,
    vendor: string,
  ) {
    super(vendor)

    this.providerId = providerId
    this.provider = provider
  }

  public async getDeviceID(): Promise<string> {
    return `${this.providerId}:${await this.starknetGetAddress()}`
  }

  async getFeatures(): Promise<Record<string, any>> {
    return {}
  }

  public async getFirmwareVersion(): Promise<string> {
    return this.provider.version
  }

  public async getModel(): Promise<string> {
    return this.vendor
  }

  public async getLabel(): Promise<string> {
    return this.vendor
  }

  public async isInitialized(): Promise<boolean> {
    return true
  }

  public async isLocked(): Promise<boolean> {
    return false
  }

  public async clearSession(): Promise<void> {}

  // Network is enforced in ensureMainnet() instead, so restoring a session on load never prompts
  public async initialize(): Promise<void> {}

  // Read-only, never prompts
  public async isMainnet(): Promise<boolean> {
    const chainId = await this.provider.request({ type: 'wallet_requestChainId' })
    return chainId === constants.StarknetChainId.SN_MAIN
  }

  // Asks to switch back to mainnet if needed, returns whether a switch happened
  public async ensureMainnet(): Promise<boolean> {
    if (await this.isMainnet()) return false

    const isSwitched = await this.provider.request({
      type: 'wallet_switchStarknetChain',
      params: { chainId: constants.StarknetChainId.SN_MAIN },
    })
    if (!isSwitched) {
      throw new StarknetInjectedError(
        'WRONG_NETWORK',
        `${this.vendor} must be set to Starknet Mainnet`,
      )
    }

    return true
  }

  public async ping(msg: core.Ping): Promise<core.Pong> {
    return { msg: msg.msg }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendPin(_pin: string): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendPassphrase(_passphrase: string): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendCharacter(_charater: string): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async sendWord(_word: string): Promise<void> {}

  public async cancel(): Promise<void> {}

  public async wipe(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async reset(_msg: core.ResetDevice): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async recover(_msg: core.RecoverDevice): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async loadDevice(_msg: core.LoadDevice): Promise<void> {}

  public async disconnect(): Promise<void> {}

  public async getPublicKeys(msg: core.GetPublicKey[]): Promise<(core.PublicKey | null)[]> {
    return msg.map(() => null)
  }

  /** Starknet */

  // `silent` only succeeds if the dApp was previously authorized, without prompting the user
  public async connect(silent = false): Promise<string | null> {
    const [address] = await this.provider.request({
      type: 'wallet_requestAccounts',
      params: { silent_mode: silent },
    })

    // Pad to 64 hex chars, matching the native wallet so AccountIds line up with tx parsing
    this.starknetAddress = address ? validateAndParseAddress(address) : null
    return this.starknetAddress
  }

  // Extension wallets expose a single connected account, so the derivation path is ignored
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async starknetGetAddress(_msg?: core.StarknetGetAddress): Promise<string | null> {
    if (this.starknetAddress) return this.starknetAddress
    return await this.connect()
  }

  // Not exposed by the wallet API, only our own deployment flow needs it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async starknetGetPublicKey(_msg: core.StarknetGetPublicKey): Promise<string | null> {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async starknetSignTx(_msg: core.StarknetSignTx): Promise<core.StarknetSignedTx | null> {
    console.error('Method not implemented - use starknetSendTx')
    return null
  }

  public async starknetSendTx(msg: core.StarknetSignTx): Promise<core.StarknetTxHash | null> {
    if (!msg.calls?.length) throw new Error('calls are required to send a Starknet transaction')

    await this.ensureMainnet()

    // The tx (e.g. swap recipient) was built for this account - never send it from another one
    const [activeAddress] = await this.provider.request({
      type: 'wallet_requestAccounts',
      params: { silent_mode: true },
    })
    if (!activeAddress || validateAndParseAddress(activeAddress) !== this.starknetAddress) {
      throw new StarknetInjectedError(
        'ACCOUNT_CHANGED',
        `${this.vendor} account changed, please review the transaction again`,
      )
    }

    const { transaction_hash } = await this.provider.request({
      type: 'wallet_addInvokeTransaction',
      params: {
        calls: msg.calls.map(call => ({
          contract_address: call.contractAddress,
          entry_point: call.entrypoint,
          calldata: call.calldata,
        })),
      },
    })

    return { hash: transaction_hash }
  }
}
