import type {
  AddEthereumChainParameter,
  Address,
  BTCAccountPath,
  BTCGetAccountPaths,
  BTCGetAddress,
  BTCSignedMessage,
  BTCSignedTx,
  BTCSignMessage,
  BTCSignTx,
  BTCVerifyMessage,
  BTCWallet,
  BTCWalletInfo,
  Coin,
  DescribePath,
  ETHAccountPath,
  ETHGetAccountPath,
  ETHSignedMessage,
  ETHSignedTx,
  ETHSignMessage,
  ETHSignTx,
  ETHSignTypedData,
  ETHTxHash,
  ETHVerifyMessage,
  ETHWallet,
  ETHWalletInfo,
  GetPublicKey,
  HDWallet,
  HDWalletInfo,
  PathDescription,
  Ping,
  Pong,
  PublicKey,
} from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'
import isObject from 'lodash/isObject'

import {
  btcGetAccountPaths,
  btcGetAddress,
  btcNextAccountPath,
  btcSignMessage,
  btcSignTx,
  btcVerifyMessage,
  describeBTCPath,
} from './bitcoin'
import {
  describeETHPath,
  ethGetAddress,
  ethSendTx,
  ethSignMessage,
  ethSignTx,
  ethSignTypedData,
  ethVerifyMessage,
} from './ethereum'

const BIP122_OPTIONAL_NAMESPACE = {
  chains: ['bip122:000000000019d6689c085ae165831e93'],
  methods: ['sendTransfer', 'signPsbt', 'signMessage', 'getAccountAddresses'],
  events: ['bip122_addressesChanged'],
}

export function isWalletConnectV2(wallet: HDWallet): wallet is WalletConnectV2HDWallet {
  return isObject(wallet) && (wallet as any)._isWalletConnectV2
}

/**
 * WalletConnect Wallet Info
 *
 * Supported JSON-RPC API Methods:
 * - personal_sign
 * - eth_sign
 * - eth_signTypedData
 * - eth_sendTransaction
 * - eth_signTransaction
 * - eth_sendRawTransaction
 * @see https://specs.walletconnect.com/2.0/blockchain-rpc/ethereum-rpc
 */
export class WalletConnectV2WalletInfo implements HDWalletInfo, ETHWalletInfo, BTCWalletInfo {
  readonly _supportsETHInfo = true
  readonly _supportsBTCInfo = true
  public getVendor(): string {
    return 'WalletConnectV2'
  }

  public hasOnDevicePinEntry(): boolean {
    return false
  }

  public hasOnDevicePassphrase(): boolean {
    return false
  }

  public hasOnDeviceDisplay(): boolean {
    return false
  }

  public hasOnDeviceRecovery(): boolean {
    return false
  }

  public hasNativeShapeShift(): boolean {
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

  public describePath(msg: DescribePath): PathDescription {
    switch (msg.coin) {
      case 'Ethereum':
        return describeETHPath(msg.path)
      case 'Bitcoin':
        return describeBTCPath(
          msg.path,
          msg.coin,
          msg.scriptType ?? BTCInputScriptType.SpendWitness,
        )
      default:
        throw new Error('Unsupported path')
    }
  }

  public ethNextAccountPath(): ETHAccountPath | undefined {
    return undefined
  }

  public async ethSupportsNetwork(chainId: number): Promise<boolean> {
    return [1, 10, 56, 100, 137, 43114].includes(chainId)
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

  public ethGetAccountPaths(msg: ETHGetAccountPath): ETHAccountPath[] {
    const slip44 = slip44ByCoin(msg.coin)
    if (slip44 === undefined) return []
    return [
      {
        addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
        hardenedPath: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
        relPath: [0, 0],
        description: 'WalletConnectV2',
      },
    ]
  }

  public async btcSupportsCoin(coin: Coin): Promise<boolean> {
    return coin === 'Bitcoin'
  }

  public async btcSupportsScriptType(
    coin: Coin,
    scriptType?: BTCInputScriptType,
  ): Promise<boolean> {
    if (coin !== 'Bitcoin') return false
    if (!scriptType) return true
    return (
      [
        BTCInputScriptType.SpendWitness,
        BTCInputScriptType.SpendP2SHWitness,
        BTCInputScriptType.SpendAddress,
      ] as BTCInputScriptType[]
    ).includes(scriptType)
  }

  public async btcSupportsSecureTransfer(): Promise<boolean> {
    return false
  }

  public btcSupportsNativeShapeShift(): boolean {
    return false
  }

  public btcGetAccountPaths(msg: BTCGetAccountPaths): BTCAccountPath[] {
    return btcGetAccountPaths(msg)
  }

  public btcNextAccountPath(msg: BTCAccountPath): BTCAccountPath | undefined {
    return btcNextAccountPath(msg)
  }
}

export class WalletConnectV2HDWallet implements HDWallet, ETHWallet, BTCWallet {
  readonly _supportsETH = true
  readonly _supportsETHInfo = true
  readonly _supportsBTCInfo = true
  readonly _isWalletConnectV2 = true
  readonly _supportsEthSwitchChain = true
  readonly _supportsAvalanche = true
  readonly _supportsOptimism = true
  readonly _supportsBSC = true
  readonly _supportsPolygon = true
  readonly _supportsGnosis = true
  readonly _supportsArbitrum = true
  readonly _supportsArbitrumNova = true
  readonly _supportsBase = true
  readonly _supportsMonad = true
  readonly _supportsPlasma = true
  readonly _supportsKatana = true
  readonly _supportsEthereal = true
  readonly _supportsCelo = true
  readonly _supportsFlowEvm = true
  readonly _supportsStory = true
  readonly _supportsSonic = true
  readonly _supportsBob = true
  readonly _supportsMode = true
  readonly _supportsSei = true
  readonly _supportsHyperEvm = true
  readonly _supportsMantle = true
  readonly _supportsInk = true
  readonly _supportsMegaEth = true
  readonly _supportsPlume = true
  readonly _supportsZkSyncEra = true
  readonly _supportsBlast = true
  readonly _supportsWorldChain = true
  readonly _supportsHemi = true
  readonly _supportsBerachain = true
  readonly _supportsLinea = true
  readonly _supportsScroll = true
  readonly _supportsCronos = true
  readonly _supportsUnichain = true
  readonly _supportsSoneium = true

  info: WalletConnectV2WalletInfo & HDWalletInfo
  provider: EthereumProvider
  connected = false
  chainId: number | undefined
  accounts: string[] = []
  ethAddress: Address | undefined
  btcAddress: string | undefined

  get _supportsBTC(): boolean {
    return !!this.provider.session?.namespaces?.bip122
  }

  constructor(provider: EthereumProvider) {
    this.provider = provider
    this.info = new WalletConnectV2WalletInfo()
    this.patchSignerForNonEvmNamespaces()
  }

  private patchSignerForNonEvmNamespaces(): void {
    const signer = this.provider.signer
    const originalConnect = signer.connect.bind(signer)
    signer.connect = async (params: Parameters<typeof signer.connect>[0]) => {
      return originalConnect({
        ...params,
        optionalNamespaces: {
          ...params.optionalNamespaces,
          bip122: BIP122_OPTIONAL_NAMESPACE,
        },
      })
    }
  }

  async getFeatures(): Promise<Record<string, any>> {
    return {}
  }

  public async isLocked(): Promise<boolean> {
    return false
  }

  public getVendor(): string {
    return 'WalletConnectV2'
  }

  public async getModel(): Promise<string> {
    return 'WalletConnectV2'
  }

  public async getLabel(): Promise<string> {
    return 'WalletConnectV2'
  }

  public async initialize(): Promise<void> {
    /** Display QR modal to connect */
    await this.provider.enable()
  }

  public hasOnDevicePinEntry(): boolean {
    return this.info.hasOnDevicePinEntry()
  }

  public hasOnDevicePassphrase(): boolean {
    return this.info.hasOnDevicePassphrase()
  }

  public hasOnDeviceDisplay(): boolean {
    return this.info.hasOnDeviceDisplay()
  }

  public hasOnDeviceRecovery(): boolean {
    return this.info.hasOnDeviceRecovery()
  }

  public hasNativeShapeShift(srcCoin: Coin, dstCoin: Coin): boolean {
    return this.info.hasNativeShapeShift(srcCoin, dstCoin)
  }

  public supportsBip44Accounts(): boolean {
    return this.info.supportsBip44Accounts()
  }

  /**
   * Supports Offline Signing
   *
   * Offline signing is supported when `signTransaction` does not broadcast
   * the tx message. WalletConnect's core Connector implementation always
   * makes a request, so offline signing is not supported.
   */
  public supportsOfflineSigning(): boolean {
    return this.info.supportsOfflineSigning()
  }

  public supportsBroadcast(): boolean {
    return this.info.supportsBroadcast()
  }

  public async clearSession(): Promise<void> {
    await this.disconnect()
  }

  public async ping(msg: Ping): Promise<Pong> {
    return { msg: msg.msg }
  }

  public async sendPin(): Promise<void> {
    return
  }

  public async sendPassphrase(): Promise<void> {
    return
  }

  public async sendCharacter(): Promise<void> {
    return
  }

  public async sendWord(): Promise<void> {
    return
  }

  public async cancel(): Promise<void> {
    return
  }

  public async wipe(): Promise<void> {
    return
  }

  public async reset(): Promise<void> {
    return
  }

  public async recover(): Promise<void> {
    return
  }

  public async loadDevice(): Promise<void> {
    return
  }

  public describePath(msg: DescribePath): PathDescription {
    return this.info.describePath(msg)
  }

  public async getPublicKeys(msg: GetPublicKey[]): Promise<(PublicKey | null)[]> {
    return await Promise.all(
      msg.map(async getPublicKey => {
        const { coin, scriptType } = getPublicKey

        if (coin === 'Bitcoin' && scriptType === BTCInputScriptType.SpendWitness) {
          const address = await this.btcGetAddress({ coin: 'Bitcoin' } as BTCGetAddress)
          return { xpub: address } as PublicKey
        }

        return null
      }),
    )
  }

  public async isInitialized(): Promise<boolean> {
    return true
  }

  public async disconnect(): Promise<void> {
    await this.provider.disconnect()
  }

  public async ethSupportsNetwork(chainId = 1): Promise<boolean> {
    return this.info.ethSupportsNetwork(chainId)
  }

  public async ethSupportsSecureTransfer(): Promise<boolean> {
    return this.info.ethSupportsSecureTransfer()
  }

  public ethSupportsNativeShapeShift(): boolean {
    return this.info.ethSupportsNativeShapeShift()
  }

  public async ethSupportsEIP1559(): Promise<boolean> {
    return this.info.ethSupportsEIP1559()
  }

  public ethGetAccountPaths(msg: ETHGetAccountPath): ETHAccountPath[] {
    return this.info.ethGetAccountPaths(msg)
  }

  public ethNextAccountPath(): ETHAccountPath | undefined {
    return this.info.ethNextAccountPath()
  }

  public async ethGetAddress(): Promise<Address | null> {
    if (this.ethAddress) {
      return this.ethAddress
    }
    const address = await ethGetAddress(this.provider)
    if (address) {
      this.ethAddress = address
      return address
    } else {
      this.ethAddress = undefined
      return null
    }
  }

  /**
   * Ethereum Signed Transaction
   *
   * @see https://docs.walletconnect.com/client-api#sign-transaction-eth_signtransaction
   */
  public async ethSignTx(msg: ETHSignTx): Promise<ETHSignedTx | null> {
    if (!this.ethAddress) {
      throw new Error('No eth address')
    }
    return ethSignTx({ ...msg, from: this.ethAddress }, this.provider)
  }

  /**
   * Ethereum Send Transaction
   *
   * @see https://docs.walletconnect.com/client-api#send-transaction-eth_sendtransaction
   */
  public async ethSendTx(msg: ETHSignTx): Promise<ETHTxHash | null> {
    if (!this.ethAddress) {
      throw new Error('No eth address')
    }
    return ethSendTx({ ...msg, from: this.ethAddress }, this.provider)
  }

  /**
   * Ethereum Sign Message
   *
   * @see https://docs.walletconnect.com/advanced/multichain/rpc-reference/ethereum-rpc#eth_sign
   * */
  public async ethSignMessage(msg: ETHSignMessage): Promise<ETHSignedMessage | null> {
    if (!this.ethAddress) {
      throw new Error('No eth address')
    }
    return ethSignMessage({ data: msg.message, fromAddress: this.ethAddress }, this.provider)
  }

  /**
   * Ethereum Sign Typed Data
   *
   * @see https://docs.walletconnect.com/advanced/multichain/rpc-reference/ethereum-rpc#eth_signtypeddata
   */
  public async ethSignTypedData(msg: ETHSignTypedData): Promise<ETHSignedMessage | null> {
    if (!this.ethAddress) {
      throw new Error('No eth address')
    }
    return ethSignTypedData({ msg, fromAddress: this.ethAddress }, this.provider)
  }

  public async ethVerifyMessage(msg: ETHVerifyMessage): Promise<boolean | null> {
    return ethVerifyMessage(this.provider, msg)
  }

  public async getDeviceID(): Promise<string> {
    const ethAddr = await this.ethGetAddress()
    if (ethAddr) return 'wc:' + ethAddr

    const btcAddr = await this.btcGetAddress({ coin: 'Bitcoin' } as BTCGetAddress)
    if (btcAddr) return 'wc:' + btcAddr

    return 'wc:unknown'
  }

  public async getFirmwareVersion(): Promise<string> {
    return 'WalletConnectV2'
  }

  public async ethGetChainId(): Promise<number | null> {
    return this.provider.chainId
  }

  public async ethSwitchChain({ chainId }: AddEthereumChainParameter): Promise<void> {
    const parsedChainId = parseInt(chainId, 16)
    if (isNaN(parsedChainId) || this.chainId === parsedChainId) {
      return
    }

    await this.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })

    this.chainId = parsedChainId
  }

  // -- BTC Methods --

  public async btcSupportsCoin(coin: Coin): Promise<boolean> {
    return this.info.btcSupportsCoin(coin)
  }

  public async btcSupportsScriptType(
    coin: Coin,
    scriptType?: BTCInputScriptType,
  ): Promise<boolean> {
    return this.info.btcSupportsScriptType(coin, scriptType)
  }

  public async btcSupportsSecureTransfer(): Promise<boolean> {
    return this.info.btcSupportsSecureTransfer()
  }

  public btcSupportsNativeShapeShift(): boolean {
    return this.info.btcSupportsNativeShapeShift()
  }

  public btcGetAccountPaths(msg: BTCGetAccountPaths): BTCAccountPath[] {
    return this.info.btcGetAccountPaths(msg)
  }

  public btcNextAccountPath(msg: BTCAccountPath): BTCAccountPath | undefined {
    return this.info.btcNextAccountPath(msg)
  }

  public async btcGetAddress(msg: BTCGetAddress): Promise<string | null> {
    if (this.btcAddress) {
      return this.btcAddress
    }
    const address = await btcGetAddress(this.provider, msg)
    if (address) {
      this.btcAddress = address
      return address
    }
    return null
  }

  public async btcSignTx(msg: BTCSignTx): Promise<BTCSignedTx | null> {
    return btcSignTx(this, this.provider, msg)
  }

  public async btcSignMessage(msg: BTCSignMessage): Promise<BTCSignedMessage | null> {
    return btcSignMessage(this.provider, msg)
  }

  public async btcVerifyMessage(msg: BTCVerifyMessage): Promise<boolean | null> {
    return btcVerifyMessage(this.provider, msg)
  }
}
