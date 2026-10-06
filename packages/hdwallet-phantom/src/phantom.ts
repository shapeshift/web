import type { Address } from '@shapeshiftoss/hdwallet-core'
import * as core from '@shapeshiftoss/hdwallet-core'
import { keccak256, recoverAddress } from 'ethers/lib/utils.js'
import isObject from 'lodash/isObject'

import * as eth from './ethereum'
import { solanaSendTx, solanaSignSerializedTx, solanaSignTx } from './solana'
import type { PhantomEvmProvider, PhantomSolanaProvider } from './types'

export function isPhantom(wallet: core.HDWallet): wallet is PhantomHDWallet {
  return isObject(wallet) && (wallet as any)._isPhantom
}

export class PhantomHDWalletInfo
  implements core.HDWalletInfo, core.ETHWalletInfo, core.SolanaWalletInfo
{
  readonly _supportsETHInfo = true
  readonly _supportsSolanaInfo = true

  evmProvider: PhantomEvmProvider

  constructor(evmProvider: PhantomEvmProvider) {
    this.evmProvider = evmProvider
  }

  public getVendor(): string {
    return 'Phantom'
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
      case 'ethereum':
        return core.describeETHPath(msg.path)
      case 'solana':
        return core.solanaDescribePath(msg.path)
      default:
        throw new Error('Unsupported path')
    }
  }

  /** Ethereum */

  public async ethSupportsNetwork(chainId: number): Promise<boolean> {
    return chainId === 1
  }

  public async ethGetChainId(): Promise<number | null> {
    try {
      if (!this.evmProvider.request) throw new Error('Provider does not support ethereum.request')
      // chainId as hex string
      const chainId: string = await this.evmProvider.request({ method: 'eth_chainId' })
      return parseInt(chainId, 16)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  public async ethSupportsSecureTransfer(): Promise<boolean> {
    return false
  }

  public ethSupportsNativeShapeShift(): boolean {
    return false
  }

  public async ethSupportsEIP1559(): Promise<boolean> {
    return true
  }

  public ethGetAccountPaths(msg: core.ETHGetAccountPath): core.ETHAccountPath[] {
    return eth.ethGetAccountPaths(msg)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public ethNextAccountPath(_msg: core.ETHAccountPath): core.ETHAccountPath | undefined {
    console.error('Method not implemented')
    return undefined
  }

  /** Solana */

  public solanaGetAccountPaths(msg: core.SolanaGetAccountPaths): core.SolanaAccountPath[] {
    return core.solanaGetAccountPaths(msg)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public solanaNextAccountPath(_msg: core.SolanaAccountPath): core.SolanaAccountPath | undefined {
    throw new Error('Method not implemented')
  }
}

export class PhantomHDWallet
  extends PhantomHDWalletInfo
  implements core.HDWallet, core.ETHWallet, core.SolanaWallet
{
  readonly _supportsETH = true
  readonly _supportsEthSwitchChain = true
  readonly _supportsAvalanche = false
  readonly _supportsOptimism = false
  readonly _supportsPolygon = true
  readonly _supportsGnosis = false
  readonly _supportsArbitrum = false
  readonly _supportsArbitrumNova = false
  readonly _supportsBase = true
  readonly _supportsMonad = false
  readonly _supportsPlasma = false
  readonly _supportsPlume = false
  readonly _supportsKatana = false
  readonly _supportsEthereal = false
  readonly _supportsStory = false
  readonly _supportsSonic = false
  readonly _supportsBob = false
  readonly _supportsMode = false
  readonly _supportsSei = false
  readonly _supportsHyperEvm = true
  readonly _supportsMantle = false
  readonly _supportsInk = false
  readonly _supportsMegaEth = false
  readonly _supportsZkSyncEra = false
  readonly _supportsBlast = false
  readonly _supportsAbstract = false
  readonly _supportsWorldChain = false
  readonly _supportsHemi = false
  readonly _supportsFlowEvm = false
  readonly _supportsCelo = false
  readonly _supportsBerachain = false
  readonly _supportsLinea = false
  readonly _supportsScroll = false
  readonly _supportsCronos = false
  readonly _supportsUnichain = false
  readonly _supportsSoneium = false
  readonly _supportsBSC = false
  readonly _supportsRobinhood = true
  readonly _supportsSolana = true
  readonly _isPhantom = true

  evmProvider: PhantomEvmProvider
  solanaProvider: PhantomSolanaProvider

  ethAddress?: Address | null
  solanaAddress?: string | null

  constructor(evmProvider: PhantomEvmProvider, solanaProvider: PhantomSolanaProvider) {
    super(evmProvider)

    this.evmProvider = evmProvider
    this.solanaProvider = solanaProvider
  }

  public async getDeviceID(): Promise<string> {
    return 'phantom:' + (await this.solanaGetAddress())
  }

  async getFeatures(): Promise<Record<string, any>> {
    return {}
  }

  public async getFirmwareVersion(): Promise<string> {
    return 'phantom'
  }

  public async getModel(): Promise<string> {
    return 'Phantom'
  }

  public async getLabel(): Promise<string> {
    return 'Phantom'
  }

  public async isInitialized(): Promise<boolean> {
    return true
  }

  public async isLocked(): Promise<boolean> {
    return !this.evmProvider._metamask.isUnlocked()
  }

  public async clearSession(): Promise<void> {}

  public async initialize(): Promise<void> {}

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

  /** Ethereum */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async ethGetAddress(_msg: core.ETHGetAddress): Promise<core.Address | null> {
    if (this.ethAddress) return this.ethAddress

    const address = await eth.ethGetAddress(this.evmProvider)

    if (address) {
      this.ethAddress = address
      return address
    }

    this.ethAddress = null
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async ethSignTx(_msg: core.ETHSignTx): Promise<core.ETHSignedTx | null> {
    console.error('Method not implemented')
    return null
  }

  public async ethSendTx(msg: core.ETHSignTx): Promise<core.ETHTxHash | null> {
    const address = await this.ethGetAddress({ addressNList: [] })
    return address ? eth.ethSendTx(msg, this.evmProvider, address) : null
  }

  public async ethSignMessage(msg: core.ETHSignMessage): Promise<core.ETHSignedMessage | null> {
    const address = await this.ethGetAddress({ addressNList: [] })
    return address ? eth.ethSignMessage(msg, this.evmProvider, address) : null
  }

  async ethSignTypedData(msg: core.ETHSignTypedData): Promise<core.ETHSignedTypedData | null> {
    const address = await this.ethGetAddress({ addressNList: [] })
    return address ? eth.ethSignTypedData(msg, this.evmProvider, address) : null
  }

  public async ethVerifyMessage(msg: core.ETHVerifyMessage): Promise<boolean | null> {
    if (!msg.signature.startsWith('0x')) msg.signature = `0x${msg.signature}`
    const digest = keccak256(core.buildMessage(msg.message))
    return recoverAddress(digest, msg.signature) === msg.address
  }

  public async ethGetChainId(): Promise<number | null> {
    try {
      const chainIdHex = await this.evmProvider.request({ method: 'eth_chainId' })
      return parseInt(chainIdHex, 16)
    } catch (error) {
      console.error('Failed to get chain ID from Phantom:', error)
      return null
    }
  }

  public async ethSwitchChain(params: core.AddEthereumChainParameter): Promise<void> {
    const parsedChainId = parseInt(params.chainId, 16)
    const currentChainId = await this.ethGetChainId()

    if (currentChainId === parsedChainId) return

    await this.evmProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: params.chainId }],
    })
  }

  /** Solana */

  public async solanaGetAddress(): Promise<string | null> {
    // Use cached address if available to prevent rate limiting
    if (this.solanaAddress !== undefined) return this.solanaAddress

    const { publicKey } = await this.solanaProvider.connect()
    const address = publicKey.toString()
    this.solanaAddress = address
    return address
  }

  public async solanaSignTx(msg: core.SolanaSignTx): Promise<core.SolanaSignedTx | null> {
    const address = await this.solanaGetAddress()
    return address ? solanaSignTx(msg, this.solanaProvider, address) : null
  }

  public async solanaSignSerializedTx(
    msg: core.SolanaSignSerializedTx,
  ): Promise<core.SolanaSignedTx | null> {
    return solanaSignSerializedTx(msg, this.solanaProvider)
  }

  public async solanaSendTx(msg: core.SolanaSignTx): Promise<core.SolanaTxSignature | null> {
    const address = await this.solanaGetAddress()
    return address ? solanaSendTx(msg, this.solanaProvider, address) : null
  }
}
