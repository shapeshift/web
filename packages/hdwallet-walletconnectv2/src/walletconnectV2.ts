import type {
  AddEthereumChainParameter,
  Address,
  Coin,
  CosmosAccountPath,
  CosmosGetAccountPaths,
  CosmosGetAddress,
  CosmosSignedTx,
  CosmosSignTx,
  CosmosWallet,
  CosmosWalletInfo,
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
  HDWallet,
  HDWalletInfo,
  PathDescription,
  Ping,
  Pong,
  PublicKey,
  SolanaAccountPath,
  SolanaGetAccountPaths,
  SolanaGetAddress,
  SolanaSignedTx,
  SolanaSignTx,
  SolanaTxSignature,
  SolanaWallet,
  SolanaWalletInfo,
} from '@shapeshiftoss/hdwallet-core'
import {
  slip44ByCoin,
  solanaDescribePath,
  solanaGetAccountPaths,
} from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'
import isObject from 'lodash/isObject'

import {
  cosmosGetAccountPaths,
  cosmosGetAddress,
  cosmosNextAccountPath,
  cosmosSignTx,
  describeCosmosPath,
} from './cosmos'
import {
  describeETHPath,
  ethGetAddress,
  ethSendTx,
  ethSignMessage,
  ethSignTx,
  ethSignTypedData,
  ethVerifyMessage,
} from './ethereum'
import { solanaGetAddress, solanaSendTx, solanaSignTx } from './solana'

const COSMOS_OPTIONAL_NAMESPACE = {
  chains: ['cosmos:cosmoshub-4'],
  methods: ['cosmos_getAccounts', 'cosmos_signAmino', 'cosmos_signDirect'],
  events: [],
}

const SOLANA_OPTIONAL_NAMESPACE = {
  chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  methods: [
    'solana_signTransaction',
    'solana_signAndSendTransaction',
    'solana_signMessage',
    'solana_signAllTransactions',
  ],
  events: [],
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
export class WalletConnectV2WalletInfo
  implements HDWalletInfo, ETHWalletInfo, CosmosWalletInfo, SolanaWalletInfo
{
  readonly _supportsETHInfo = true
  readonly _supportsBTCInfo = false
  readonly _supportsCosmosInfo = true
  readonly _supportsSolanaInfo = true
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
      case 'Atom':
        return describeCosmosPath(msg.path)
      case 'Solana':
        return solanaDescribePath(msg.path)
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

  public cosmosGetAccountPaths(msg: CosmosGetAccountPaths): CosmosAccountPath[] {
    return cosmosGetAccountPaths(msg)
  }

  public cosmosNextAccountPath(_msg: CosmosAccountPath): CosmosAccountPath | undefined {
    return cosmosNextAccountPath(_msg)
  }

  public solanaGetAccountPaths(msg: SolanaGetAccountPaths): SolanaAccountPath[] {
    return solanaGetAccountPaths(msg)
  }

  public solanaNextAccountPath(_msg: SolanaAccountPath): SolanaAccountPath | undefined {
    return undefined
  }
}

export class WalletConnectV2HDWallet implements HDWallet, ETHWallet, CosmosWallet, SolanaWallet {
  readonly _supportsETHInfo = true
  readonly _supportsBTCInfo = false
  readonly _supportsBTC = false
  readonly _supportsCosmosInfo = true
  readonly _supportsSolanaInfo = true
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
  cosmosAddress: string | undefined
  solanaAddress: string | undefined

  get _supportsETH(): boolean {
    return !!this.provider.session?.namespaces?.eip155
  }

  get _supportsCosmos(): boolean {
    return !!this.provider.session?.namespaces?.cosmos
  }

  get _supportsSolana(): boolean {
    return !!this.provider.session?.namespaces?.solana
  }

  constructor(provider: EthereumProvider) {
    this.provider = provider
    this.info = new WalletConnectV2WalletInfo()
    this.patchSignerForNonEvmNamespaces()
    this.patchProviderConnectForMultiNamespace()
  }

  private patchSignerForNonEvmNamespaces(): void {
    const signer = this.provider.signer
    const originalConnect = signer.connect.bind(signer)
    signer.connect = async (params: Parameters<typeof signer.connect>[0]) => {
      const requiredEvm = params.namespaces?.eip155
      const optionalEvm = params.optionalNamespaces?.eip155

      const mergedEvmChains = [
        ...new Set([...(requiredEvm?.chains ?? []), ...(optionalEvm?.chains ?? [])]),
      ]
      const mergedEvmMethods = [
        ...new Set([...(requiredEvm?.methods ?? []), ...(optionalEvm?.methods ?? [])]),
      ]
      const mergedEvmEvents = [
        ...new Set([...(requiredEvm?.events ?? []), ...(optionalEvm?.events ?? [])]),
      ]

      return originalConnect({
        ...params,
        namespaces: {},
        optionalNamespaces: {
          eip155: {
            chains: mergedEvmChains,
            methods: mergedEvmMethods,
            events: mergedEvmEvents,
            rpcMap: {
              ...(requiredEvm as any)?.rpcMap,
              ...(optionalEvm as any)?.rpcMap,
            },
          },
          cosmos: COSMOS_OPTIONAL_NAMESPACE,
          solana: SOLANA_OPTIONAL_NAMESPACE,
        },
      })
    }
  }

  /**
   * Two patches for multi-namespace (EVM + Solana/Cosmos) session support:
   *
   * 1. connect(): The AppKit modal's subscribeState callback aborts pairing
   *    when the modal closes before signer.session is set. Temporarily no-op
   *    subscribeState to prevent premature abort.
   *
   * 2. enable(): After connect(), EthereumProvider calls eth_requestAccounts
   *    which fails for Solana-only wallets (no eip155 namespace in session).
   *    Catch this error so the session is still usable for non-EVM chains.
   */
  private patchProviderConnectForMultiNamespace(): void {
    const provider = this.provider as any

    const originalConnect = provider.connect.bind(provider)
    provider.connect = async (opts?: any) => {
      const modal = provider.modal
      const originalSubscribeState = modal?.subscribeState?.bind(modal)

      if (modal) {
        modal.subscribeState = () => {}
      }

      try {
        await originalConnect(opts)
      } finally {
        if (modal && originalSubscribeState) {
          modal.subscribeState = originalSubscribeState
        }
      }
    }

    const originalEnable = provider.enable.bind(provider)
    provider.enable = async () => {
      try {
        return await originalEnable()
      } catch (e: unknown) {
        if (provider.signer?.session) return []
        throw e
      }
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

  public async getPublicKeys(): Promise<(PublicKey | null)[]> {
    // Ethereum public keys are not exposed by the RPC API
    return []
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

    const session = this.provider.session
    const solanaAccounts = session?.namespaces?.solana?.accounts
    if (solanaAccounts?.[0]) return 'wc:' + solanaAccounts[0].split(':')[2]

    const cosmosAccounts = session?.namespaces?.cosmos?.accounts
    if (cosmosAccounts?.[0]) return 'wc:' + cosmosAccounts[0].split(':')[2]

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

  // -- Cosmos Methods --

  public cosmosGetAccountPaths(msg: CosmosGetAccountPaths): CosmosAccountPath[] {
    return this.info.cosmosGetAccountPaths(msg)
  }

  public cosmosNextAccountPath(msg: CosmosAccountPath): CosmosAccountPath | undefined {
    return this.info.cosmosNextAccountPath(msg)
  }

  public async cosmosGetAddress(msg: CosmosGetAddress): Promise<string | null> {
    if (this.cosmosAddress) {
      return this.cosmosAddress
    }
    const address = await cosmosGetAddress(this.provider, msg)
    if (address) {
      this.cosmosAddress = address
      return address
    }
    return null
  }

  public async cosmosSignTx(msg: CosmosSignTx): Promise<CosmosSignedTx | null> {
    return cosmosSignTx(this.provider, msg)
  }

  // -- Solana Methods --

  public solanaGetAccountPaths(msg: SolanaGetAccountPaths): SolanaAccountPath[] {
    return this.info.solanaGetAccountPaths(msg)
  }

  public solanaNextAccountPath(msg: SolanaAccountPath): SolanaAccountPath | undefined {
    return this.info.solanaNextAccountPath(msg)
  }

  public async solanaGetAddress(msg: SolanaGetAddress): Promise<string | null> {
    if (this.solanaAddress) {
      return this.solanaAddress
    }
    const address = await solanaGetAddress(this.provider, msg)
    if (address) {
      this.solanaAddress = address
      return address
    }
    return null
  }

  public async solanaSignTx(msg: SolanaSignTx): Promise<SolanaSignedTx | null> {
    if (!this.solanaAddress) throw new Error('No solana address')
    return solanaSignTx(this.provider, msg, this.solanaAddress)
  }

  public async solanaSendTx(msg: SolanaSignTx): Promise<SolanaTxSignature | null> {
    if (!this.solanaAddress) throw new Error('No solana address')
    return solanaSendTx(this.provider, msg, this.solanaAddress)
  }
}
