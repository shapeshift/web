import ecc from '@bitcoinerlab/secp256k1'
import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'
import type { AddEthereumChainParameter, Address } from '@shapeshiftoss/hdwallet-core'
import * as core from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { VersionedTransaction } from '@solana/web3.js'
import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { ethErrors, serializeError } from 'eth-rpc-errors'
import isObject from 'lodash/isObject'
import type { EIP6963ProviderDetail } from 'mipd'

import * as Eth from './ethereum'

// MetaMask Bitcoin Wallet Standard feature types (not typed in @wallet-standard)
type BitcoinConnectFeature = {
  'bitcoin:connect': {
    version: '1.0.0'
    connect: (input?: {
      purposes?: ('payment' | 'ordinals')[]
    }) => Promise<{ addresses: { address: string; publicKey: Uint8Array }[] }>
  }
}

type BitcoinSignTransactionFeature = {
  'bitcoin:signTransaction': {
    version: '1.0.0'
    signTransaction: (input: {
      psbt: string // base64-encoded PSBT
      inputsToSign: {
        address: string
        signingIndexes: number[]
        sigHash?: number
      }[]
    }) => Promise<{ psbt: string }> // signed base64-encoded PSBT
  }
}

type BtcWalletStandard = Wallet & {
  features: {
    'standard:connect': {
      connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }>
    }
    'bitcoin:connect': BitcoinConnectFeature['bitcoin:connect']
    'bitcoin:signTransaction': BitcoinSignTransactionFeature['bitcoin:signTransaction']
  }
}

function getMetaMaskBtcWallet(): BtcWalletStandard | undefined {
  const wallets = getWallets().get()
  const btcWallet = wallets.find(
    w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('bitcoin:')),
  ) as BtcWalletStandard | undefined
  return btcWallet
}

const getNetwork = (coin: string): bitcoin.networks.Network => {
  switch (coin.toLowerCase()) {
    case 'bitcoin':
      return bitcoin.networks.bitcoin
    default:
      throw new Error(`Unsupported coin: ${coin}`)
  }
}

const btcGetAccountPathsImpl = (msg: core.BTCGetAccountPaths): core.BTCAccountPath[] => {
  const slip44 = core.slip44ByCoin(msg.coin)
  if (slip44 === undefined) return []

  const bip84 = core.segwitNativeAccount(msg.coin, slip44, msg.accountIdx)

  const coinPaths = {
    bitcoin: [bip84],
  } as Partial<Record<string, core.BTCAccountPath[]>>

  let paths: core.BTCAccountPath[] = coinPaths[msg.coin.toLowerCase()] || []

  if (msg.scriptType !== undefined) {
    paths = paths.filter(path => {
      return path.scriptType === msg.scriptType
    })
  }

  return paths
}

type SolanaSignTransactionMethod = (
  ...inputs: readonly {
    readonly account: WalletAccount
    readonly transaction: Uint8Array
    readonly chain?: string
  }[]
) => Promise<readonly { readonly signedTransaction: Uint8Array }[]>

type SolWalletStandard = Wallet & {
  features: {
    'standard:connect': {
      connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }>
    }
    'solana:signTransaction': {
      signTransaction: SolanaSignTransactionMethod
    }
  }
}

function getMetaMaskSolWallet(): SolWalletStandard | undefined {
  const wallets = getWallets().get()
  const solWallet = wallets.find(
    w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:')),
  ) as SolWalletStandard | undefined
  return solWallet
}

export function isMetaMaskNativeMultichain(
  wallet: core.HDWallet | null,
): wallet is MetaMaskNativeMultiChainHDWallet {
  return isObject(wallet) && (wallet as any)._isMetaMaskNativeMultichain
}

export class MetaMaskNativeMultiChainHDWalletInfo
  implements core.HDWalletInfo, core.ETHWalletInfo, core.SolanaWalletInfo
{
  ethGetChainId?(): Promise<number | null> {
    throw new Error('Method not implemented.')
  }

  ethSwitchChain?(_params: core.AddEthereumChainParameter): Promise<void> {
    throw new Error('Method not implemented.')
  }

  ethAddChain?(_params: core.AddEthereumChainParameter): Promise<void> {
    throw new Error('Method not implemented.')
  }
  _supportsBTCInfo = false
  readonly _supportsETHInfo = true
  _supportsSolanaInfo = false
  readonly _supportsCosmosInfo = false
  readonly _supportsBinanceInfo = false
  readonly _supportsRippleInfo = false
  readonly _supportsEosInfo = false
  readonly _supportsThorchainInfo = false

  public getVendor(): string {
    return 'MetaMask'
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

  public hasNativeShapeShift(_srcCoin: core.Coin, _dstCoin: core.Coin): boolean {
    return false
  }

  public supportsBip44Accounts(): boolean {
    return true
  }

  public supportsOfflineSigning(): boolean {
    return false
  }

  public supportsBroadcast(): boolean {
    return true
  }

  public describePath(msg: core.DescribePath): core.PathDescription {
    switch (msg.coin) {
      case 'Bitcoin':
        return core.describeUTXOPath(msg.path, msg.coin, msg.scriptType!)

      case 'Ethereum':
        return core.describeETHPath(msg.path)

      case 'Solana':
        return core.solanaDescribePath(msg.path)

      default:
        throw new Error('Unsupported path')
    }
  }

  public async bitcoinSupportsNetwork(chainId = 0): Promise<boolean> {
    return chainId === 0
  }

  public async bitcoinSupportsSecureTransfer(): Promise<boolean> {
    return false
  }

  public bitcoinSupportsNativeShapeShift(): boolean {
    return false
  }

  public bitcoinGetAccountPaths(msg: core.BTCGetAccountPaths): core.BTCAccountPath[] {
    return btcGetAccountPathsImpl(msg)
  }

  public bitcoinNextAccountPath(_msg: core.BTCAccountPath): core.BTCAccountPath | undefined {
    return undefined
  }

  public async ethSupportsNetwork(chainId: number): Promise<boolean> {
    return chainId === 1
  }

  public async ethSupportsSecureTransfer(): Promise<boolean> {
    return false
  }

  public ethSupportsNativeShapeShift(): boolean {
    return false
  }

  public ethGetAccountPaths(msg: core.ETHGetAccountPath): core.ETHAccountPath[] {
    return Eth.ethGetAccountPaths(msg)
  }

  public ethNextAccountPath(_msg: core.ETHAccountPath): core.ETHAccountPath | undefined {
    return undefined
  }

  public async ethSupportsEIP1559(): Promise<boolean> {
    return true
  }

  public solanaGetAccountPaths(msg: core.SolanaGetAccountPaths): core.SolanaAccountPath[] {
    return core.solanaGetAccountPaths(msg)
  }

  public solanaNextAccountPath(_msg: core.SolanaAccountPath): core.SolanaAccountPath | undefined {
    return undefined
  }
}

// Helper to extract account index from BIP44 addressNList
// BIP44: m/purpose'/coin'/account'/change/index
// Account is at index 2, hardened (0x80000000 mask)
const getAccountIndex = (addressNList: core.BIP32Path): number => {
  if (addressNList.length >= 3) {
    return addressNList[2] & ~0x80000000 // strip hardened bit
  }
  return 0
}

export class MetaMaskNativeMultiChainHDWallet
  implements core.HDWallet, core.BTCWallet, core.ETHWallet, core.SolanaWallet
{
  readonly _supportsETH = true
  readonly _supportsETHInfo = true
  // BTC/SOL support is dynamic - depends on whether MetaMask registers
  // the corresponding Wallet Standard wallets in this browser version.
  _supportsBTCInfo = false
  _supportsBTC = false
  _supportsSolanaInfo = false
  _supportsSolana = false
  readonly _supportsCosmosInfo = false
  readonly _supportsCosmos = false
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
  readonly _supportsAbstract = true
  readonly _supportsWorldChain = true
  readonly _supportsHemi = true
  readonly _supportsBerachain = true
  readonly _supportsLinea = true
  readonly _supportsScroll = true
  readonly _supportsCronos = true
  readonly _supportsUnichain = true
  readonly _supportsSoneium = true
  readonly _supportsOsmosisInfo = false
  readonly _supportsOsmosis = false
  readonly _supportsBinanceInfo = false
  readonly _supportsBinance = false
  readonly _supportsDebugLink = false
  readonly _isPortis = false
  readonly _isMetaMask = true
  readonly _isMetaMaskNativeMultichain = true
  readonly _supportsRippleInfo = false
  readonly _supportsRipple = false
  readonly _supportsEosInfo = false
  readonly _supportsEos = false
  readonly _supportsThorchainInfo = false
  readonly _supportsThorchain = false

  info: MetaMaskNativeMultiChainHDWalletInfo & core.HDWalletInfo
  ethAddress?: Address | null
  private btcAddresses: string[] = []
  private btcPublicKeys: Uint8Array[] = []
  private solAddresses: string[] = []
  private btcConnected = false
  private btcConnecting: Promise<boolean> | null = null
  private solConnected = false
  private solConnecting: Promise<boolean> | null = null
  private solAccounts: readonly WalletAccount[] = []
  private solWallet?: SolWalletStandard
  private btcWallet?: BtcWalletStandard
  providerRdns: string
  provider: any

  constructor(provider: EIP6963ProviderDetail) {
    this.info = new MetaMaskNativeMultiChainHDWalletInfo()

    this.providerRdns = provider.info.rdns
    this.provider = provider.provider

    // Detect which non-EVM Wallet Standard wallets MetaMask exposes in this version.
    // This must run in the constructor (not initialize()) so flags are set before
    // any supportsSolana()/supportsBTC() checks run against this wallet instance.
    const hasBtc = !!getMetaMaskBtcWallet()
    const hasSol = !!getMetaMaskSolWallet()
    this._supportsBTC = hasBtc
    this._supportsBTCInfo = hasBtc
    this._supportsSolana = hasSol
    this._supportsSolanaInfo = hasSol
    this.info._supportsBTCInfo = hasBtc
    this.info._supportsSolanaInfo = hasSol
  }

  transport?: core.Transport | undefined

  async getFeatures(): Promise<Record<string, any>> {
    return {}
  }

  public async isLocked(): Promise<boolean> {
    try {
      return !this.provider._metamask.isUnlocked()
    } catch (e) {
      // This may not be properly implemented in MM impersonators, e.g
      // https://github.com/zeriontech/zerion-wallet-extension/blob/294630a4e1ef303205a6e6dd681245a27c8d1eec/src/modules/ethereum/provider.ts#L36C1-L39
      // Assume unlocked, but log the error regardless in case this happens with *actual* MM
      console.error(e)
      return false
    }
  }

  public getVendor(): string {
    return 'MetaMask'
  }

  public async getModel(): Promise<string> {
    return 'MetaMask (Native Multichain)'
  }

  public async getLabel(): Promise<string> {
    return 'MetaMask (Native Multichain)'
  }

  public async initialize(): Promise<void> {
    // noop - BTC/SOL support flags are set in constructor
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

  public hasNativeShapeShift(srcCoin: core.Coin, dstCoin: core.Coin): boolean {
    return this.info.hasNativeShapeShift(srcCoin, dstCoin)
  }

  public supportsBip44Accounts(): boolean {
    return true
  }

  public supportsOfflineSigning(): boolean {
    return false
  }

  public supportsBroadcast(): boolean {
    return true
  }

  public async clearSession(): Promise<void> {
    // TODO: Can we lock MetaMask from here?
  }

  public async ping(msg: core.Ping): Promise<core.Pong> {
    // no ping function for MetaMask, so just returning Core.Pong
    return { msg: msg.msg }
  }

  public async sendPin(_pin: string): Promise<void> {
    // no concept of pin in MetaMask
  }

  public async sendPassphrase(_passphrase: string): Promise<void> {
    // cannot send passphrase to MetaMask. Could show the widget?
  }

  public async sendCharacter(_charater: string): Promise<void> {
    // no concept of sendCharacter in MetaMask
  }

  public async sendWord(_word: string): Promise<void> {
    // no concept of sendWord in MetaMask
  }

  public async cancel(): Promise<void> {
    // no concept of cancel in MetaMask
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async wipe(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async reset(_msg: core.ResetDevice): Promise<void> {}

  public async recover(_msg: core.RecoverDevice): Promise<void> {
    // no concept of recover in MetaMask
  }

  public async loadDevice(_msg: core.LoadDevice): Promise<void> {
    // TODO: Does MetaMask allow this to be done programatically?
  }

  public describePath(msg: core.DescribePath): core.PathDescription {
    return this.info.describePath(msg)
  }

  public async getPublicKeys(msg: core.GetPublicKey[]): Promise<(core.PublicKey | null)[] | null> {
    // Connect to MM BTC wallet and return the public key for BTC requests
    const hasBtcRequest = msg.some(m => m.coin === 'Bitcoin')
    if (!hasBtcRequest) return null

    const connected = await this.connectBtcWallet()
    if (!connected || !this.btcPublicKeys.length) return null

    // Return the public key as xpub is not available from Wallet Standard,
    // but the raw public key hex is sufficient for our needs
    return msg.map(m => {
      if (m.coin === 'Bitcoin') {
        const accountIndex = getAccountIndex(m.addressNList)
        const pubKey = this.btcPublicKeys[accountIndex]
        if (pubKey) {
          return { xpub: Buffer.from(pubKey).toString('hex') }
        }
      }
      return null
    })
  }

  public async isInitialized(): Promise<boolean> {
    return true
  }

  /** BITCOIN - uses Bitcoin Wallet Standard to interact with MetaMask's native BTC wallet */

  private getBtcWallet(): BtcWalletStandard | undefined {
    if (!this.btcWallet) {
      this.btcWallet = getMetaMaskBtcWallet()
    }
    return this.btcWallet
  }

  private async connectBtcWallet(): Promise<boolean> {
    if (this.btcConnected) return this.btcAddresses.length > 0
    if (this.btcConnecting) return this.btcConnecting

    this.btcConnecting = (async () => {
      const wallet = this.getBtcWallet()
      if (!wallet) {
        this.btcConnected = true
        return false
      }

      try {
        const { addresses } = await wallet.features['bitcoin:connect'].connect({
          purposes: ['payment'],
        })
        if (!addresses.length) {
          this.btcConnected = true
          return false
        }
        // Cache ALL addresses and public keys from MM
        this.btcAddresses = addresses.map(a => a.address)
        this.btcPublicKeys = addresses.map(a => a.publicKey)
        this.btcConnected = true
        return true
      } catch (e) {
        console.error('[MM Native BTC] bitcoin:connect FAILED:', e)
        this.btcConnected = true
        return false
      } finally {
        this.btcConnecting = null
      }
    })()

    return this.btcConnecting
  }

  public async btcSupportsSecureTransfer(): Promise<boolean> {
    return false
  }

  public btcSupportsNativeShapeShift(): boolean {
    return false
  }

  public btcGetAccountPaths(msg: core.BTCGetAccountPaths): core.BTCAccountPath[] {
    return btcGetAccountPathsImpl(msg)
  }

  public btcNextAccountPath(_msg: core.BTCAccountPath): core.BTCAccountPath | undefined {
    return undefined
  }

  public async btcGetAddress(msg: core.BTCGetAddress): Promise<string | null> {
    const connected = await this.connectBtcWallet()
    if (!connected) return null

    const accountIndex = getAccountIndex(msg.addressNList)
    return this.btcAddresses[accountIndex] ?? null
  }

  public async btcSignTx(msg: core.BTCSignTx): Promise<core.BTCSignedTx | null> {
    const wallet = this.getBtcWallet()
    if (!wallet) return null

    const connected = await this.connectBtcWallet()
    if (!connected) return null

    // Init ecc lib required for taproot sends
    bitcoin.initEccLib(ecc)

    const network = getNetwork(msg.coin)
    const psbt = new bitcoin.Psbt({ network })

    psbt.setVersion(msg.version ?? 2)
    if (msg.locktime) {
      psbt.setLocktime(msg.locktime)
    }

    // Add inputs
    for (const input of msg.inputs) {
      switch (input.scriptType) {
        case BTCInputScriptType.SpendWitness: {
          psbt.addInput({
            hash: input.txid,
            index: input.vout,
            nonWitnessUtxo: Buffer.from(input.hex, 'hex'),
            ...(input.sequence !== undefined && { sequence: input.sequence }),
          })
          break
        }
        default:
          throw new Error(`Unsupported script type: ${input.scriptType}`)
      }
    }

    // Add outputs
    for (const output of msg.outputs) {
      if (!output.amount) throw new Error('Invalid output - missing amount.')

      const address = await (async () => {
        if (output.address) return output.address

        if (output.addressNList) {
          const outputAddress = await this.btcGetAddress({
            addressNList: output.addressNList,
            coin: msg.coin,
            showDisplay: false,
          })
          if (!outputAddress) throw new Error('Could not get address from wallet')
          return outputAddress
        }
      })()

      if (!address) throw new Error('Invalid output - no address')
      psbt.addOutput({ address, value: BigInt(output.amount) })
    }

    // OP_RETURN for THORChain memos
    if (msg.opReturnData) {
      const data = Buffer.from(msg.opReturnData, 'utf-8')
      const embed = bitcoin.payments.embed({ data: [data] })
      const script = embed.output
      if (!script) throw new Error('unable to build OP_RETURN script')
      psbt.addOutput({ script, value: BigInt(0) })
    }

    // Build inputsToSign - group by address
    const inputsToSign = await Promise.all(
      msg.inputs.map(async (input, index) => {
        const address = await this.btcGetAddress({
          addressNList: input.addressNList,
          coin: msg.coin,
          showDisplay: false,
        })

        if (!address) throw new Error('Could not get address from wallet')

        return {
          address,
          signingIndexes: [index],
          sigHash: bitcoin.Transaction.SIGHASH_ALL,
        }
      }),
    )

    // Sign via MM Bitcoin Wallet Standard - uses base64 encoded PSBT
    const psbtBase64 = Buffer.from(psbt.toBuffer()).toString('base64')
    const { psbt: signedPsbtBase64 } = await wallet.features[
      'bitcoin:signTransaction'
    ].signTransaction({
      psbt: psbtBase64,
      inputsToSign,
    })

    const signedPsbt = bitcoin.Psbt.fromBuffer(Buffer.from(signedPsbtBase64, 'base64'), {
      network,
    })

    signedPsbt.finalizeAllInputs()

    const tx = signedPsbt.extractTransaction()

    // If this is a THORChain transaction, validate the vout ordering
    if (msg.vaultAddress && !core.validateVoutOrdering(msg, tx)) {
      throw new Error('Improper vout ordering for BTC Thorchain transaction')
    }

    const signatures = signedPsbt.data.inputs.map(input =>
      input.partialSig ? Buffer.from(input.partialSig[0].signature).toString('hex') : '',
    )

    return {
      signatures,
      serializedTx: tx.toHex(),
    }
  }

  public async btcSignMessage(_msg: core.BTCSignMessage): Promise<core.BTCSignedMessage | null> {
    // MM doesn't support BTC message signing via Wallet Standard yet
    return null
  }

  public async btcVerifyMessage(_msg: core.BTCVerifyMessage): Promise<boolean | null> {
    // MM doesn't support BTC message verification via Wallet Standard yet
    return null
  }

  public async btcSupportsScriptType(
    coin: string,
    scriptType?: core.BTCInputScriptType | undefined,
  ): Promise<boolean> {
    if (coin !== 'Bitcoin') return false
    // MetaMask only supports native segwit (bip84)
    return scriptType === BTCInputScriptType.SpendWitness
  }

  public async btcSupportsCoin(coin: core.Coin): Promise<boolean> {
    return coin === 'Bitcoin'
  }

  /** ETHEREUM - identical to existing MetaMaskMultiChainHDWallet */

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async disconnect(): Promise<void> {}

  public async ethSupportsNetwork(chainId = 1): Promise<boolean> {
    return chainId === 1
  }

  public async ethGetChainId(): Promise<number | null> {
    try {
      // chainId as hex string
      const chainId: string = await this.provider.request({ method: 'eth_chainId' })
      return parseInt(chainId, 16)
    } catch (e) {
      console.error(e)
      return null
    }
  }

  public async ethAddChain(params: AddEthereumChainParameter): Promise<void> {
    // at this point, we know that we're in the context of a valid MetaMask provider
    await this.provider.request({ method: 'wallet_addEthereumChain', params: [params] })
  }

  public async ethSwitchChain(params: AddEthereumChainParameter): Promise<void> {
    try {
      // at this point, we know that we're in the context of a valid MetaMask provider
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: params.chainId }],
      })
    } catch (e: any) {
      const error = serializeError(e)
      // https://docs.metamask.io/guide/ethereum-provider.html#errors
      // Internal error, which in the case of wallet_switchEthereumChain call means the chain isn't currently added to the wallet
      if (error.code === -32603) {
        try {
          await this.ethAddChain(params)
          return
        } catch (addChainE: any) {
          const addChainError = serializeError(addChainE)

          if (addChainError.code === 4001) {
            throw ethErrors.provider.userRejectedRequest()
          }

          if (!(addChainError.data as any)?.originalError) {
            throw addChainError
          }

          throw (addChainError.data as any).originalError as {
            code: number
            message: string
            stack: string
          }
        }
      }

      if (error.code === 4001) {
        throw ethErrors.provider.userRejectedRequest()
      }

      throw (error.data as any).originalError as {
        code: number
        message: string
        stack: string
      }
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
    return Eth.ethGetAccountPaths(msg)
  }

  public ethNextAccountPath(_msg: core.ETHAccountPath): core.ETHAccountPath | undefined {
    return this.info.ethNextAccountPath(_msg)
  }

  // TODO: Respect msg.addressNList!
  public async ethGetAddress(_msg: core.ETHGetAddress): Promise<core.Address | null> {
    if (this.ethAddress) {
      return this.ethAddress
    }
    const address = await Eth.ethGetAddress(this.provider)
    if (address) {
      this.ethAddress = address
      return address
    } else {
      this.ethAddress = null
      return null
    }
  }

  public async ethSignTx(msg: core.ETHSignTx): Promise<core.ETHSignedTx | null> {
    const address = await this.ethGetAddress(this.provider)
    return address ? Eth.ethSignTx(msg, this.provider, address) : null
  }

  public async ethSendTx(msg: core.ETHSignTx): Promise<core.ETHTxHash | null> {
    const txid = await this.ethGetAddress(this.provider)
    return txid ? Eth.ethSendTx(msg, this.provider, txid) : null
  }

  public async ethSignMessage(msg: core.ETHSignMessage): Promise<core.ETHSignedMessage | null> {
    const address = await this.ethGetAddress(this.provider)
    return address ? Eth.ethSignMessage(msg, this.provider, address) : null
  }

  async ethSignTypedData(msg: core.ETHSignTypedData): Promise<core.ETHSignedTypedData | null> {
    const address = await this.ethGetAddress(this.provider)
    return address ? Eth.ethSignTypedData(msg, this.provider, address) : null
  }

  public async ethVerifyMessage(msg: core.ETHVerifyMessage): Promise<boolean | null> {
    return Eth.ethVerifyMessage(msg, this.provider)
  }

  /** SOLANA - uses Wallet Standard to interact with MetaMask's native SOL wallet */

  public solanaGetAccountPaths(msg: core.SolanaGetAccountPaths): core.SolanaAccountPath[] {
    return core.solanaGetAccountPaths(msg)
  }

  public solanaNextAccountPath(_msg: core.SolanaAccountPath): core.SolanaAccountPath | undefined {
    return undefined
  }

  private getSolWallet(): SolWalletStandard | undefined {
    if (!this.solWallet) {
      this.solWallet = getMetaMaskSolWallet()
    }
    return this.solWallet
  }

  private async connectSolWallet(): Promise<boolean> {
    if (this.solConnected) return this.solAddresses.length > 0
    if (this.solConnecting) return this.solConnecting

    this.solConnecting = (async () => {
      const wallet = this.getSolWallet()
      if (!wallet) {
        this.solConnected = true
        return false
      }

      try {
        const { accounts } = await wallet.features['standard:connect'].connect()
        // Filter to only Solana accounts and cache all of them
        const solanaAccounts = accounts.filter(a => a.chains.some(c => c.startsWith('solana:')))
        this.solAddresses = solanaAccounts.map(a => a.address)
        this.solAccounts = solanaAccounts
        this.solConnected = true
        return this.solAddresses.length > 0
      } catch (e) {
        console.error('[MM Native SOL] standard:connect FAILED:', e)
        this.solConnected = true
        return false
      } finally {
        this.solConnecting = null
      }
    })()

    return this.solConnecting
  }

  public async solanaGetAddress(msg: core.SolanaGetAddress): Promise<string | null> {
    const connected = await this.connectSolWallet()
    if (!connected) return null

    const accountIndex = getAccountIndex(msg.addressNList)
    return this.solAddresses[accountIndex] ?? null
  }

  public async solanaSignTx(msg: core.SolanaSignTx): Promise<core.SolanaSignedTx | null> {
    const wallet = this.getSolWallet()
    if (!wallet) return null

    const connected = await this.connectSolWallet()
    if (!connected) return null

    // Use account index from msg if available, default to account 0
    const accountIndex = msg.addressNList ? getAccountIndex(msg.addressNList) : 0
    const address = this.solAddresses[accountIndex]
    if (!address) return null

    // Get the connected account for the sign request
    const account = this.solAccounts.find(a => a.address === address)
    if (!account) return null

    const transaction = core.solanaBuildTransaction(msg, address)
    const serializedTx = transaction.serialize()

    const [{ signedTransaction }] = await wallet.features['solana:signTransaction'].signTransaction(
      {
        account,
        transaction: serializedTx,
        chain: 'solana:mainnet',
      },
    )

    // Deserialize the signed transaction to extract signatures
    const decoded = VersionedTransaction.deserialize(signedTransaction)

    return {
      serialized: Buffer.from(signedTransaction).toString('base64'),
      signatures: decoded.signatures.map(sig => Buffer.from(sig).toString('base64')),
    }
  }

  // solanaSendTx intentionally not implemented - we rely on the chain adapter's
  // sign + broadcast fallback which uses our own RPC for reliable broadcasting,
  // rather than depending on MetaMask's signAndSendTransaction broadcast.

  public async getDeviceID(): Promise<string> {
    return this.providerRdns + ':' + (await this.ethGetAddress(this.provider))
  }

  public async getFirmwareVersion(): Promise<string> {
    return this.providerRdns
  }
}
