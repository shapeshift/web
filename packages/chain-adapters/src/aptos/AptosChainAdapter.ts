import type { InputEntryFunctionData } from '@aptos-labs/ts-sdk'
import {
  AccountAuthenticatorEd25519,
  Aptos,
  AptosConfig,
  Deserializer,
  Ed25519PublicKey,
  Ed25519Signature,
  Network,
  SimpleTransaction,
} from '@aptos-labs/ts-sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  aptosAssetId,
  aptosChainId,
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { AptosWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsAptos } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ChainAdapterError, ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBip44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList, verifyLedgerAppOpen } from '../utils'
import type { AptosToken } from './types'

export interface ChainAdapterArgs {
  rpcUrl: string
  indexerUrl: string
}

const APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'
const MIN_MAX_GAS_AMOUNT = 20_000n

export class ChainAdapter implements IChainAdapter<KnownChainIds.AptosMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Aptos),
    accountNumber: 0,
  }

  protected readonly chainId = aptosChainId
  protected readonly assetId = aptosAssetId
  protected readonly rpcUrl: string
  protected readonly indexerUrl: string
  protected readonly client: Aptos

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
    this.indexerUrl = args.indexerUrl
    this.client = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        fullnode: args.rpcUrl,
        indexer: args.indexerUrl,
      }),
    )
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is AptosWallet {
    if (!supportsAptos(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    return 'Aptos'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Aptos
  }

  getRpcUrl() {
    return this.rpcUrl
  }

  getType(): KnownChainIds.AptosMainnet {
    return KnownChainIds.AptosMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return {
      ...ChainAdapter.rootBip44Params,
      accountNumber,
      isChange: false,
      addressIndex: 0,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const address = await wallet.aptosGetAddress({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('error getting address from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAddress',
      })
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.AptosMainnet>> {
    try {
      const balances = await this.client.getAccountCoinsData({
        accountAddress: pubkey,
      })

      let nativeBalance = '0'
      const tokens: AptosToken[] = []

      for (const entry of balances) {
        if (!entry.asset_type || BigInt(entry.amount ?? 0) === 0n) continue

        if (entry.asset_type === APT_COIN_TYPE) {
          nativeBalance = String(entry.amount)
          continue
        }

        const assetId = toAssetId({
          chainId: this.chainId,
          assetNamespace: ASSET_NAMESPACE.aptosCoin,
          assetReference: entry.asset_type,
        })

        tokens.push({
          assetId,
          balance: String(entry.amount),
          symbol: entry.metadata?.symbol ?? 'UNKNOWN',
          name: entry.metadata?.name ?? entry.asset_type,
          precision: entry.metadata?.decimals ?? 0,
        })
      }

      return {
        balance: nativeBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: { tokens },
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      if (!address.startsWith('0x')) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      const hexPart = address.slice(2)
      if (hexPart.length !== 64) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
    } catch {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  getTxHistory(): Promise<never> {
    throw new Error('Aptos transaction history not yet implemented')
  }

  private async estimateMaxGasAmount(
    sender: string,
    data: InputEntryFunctionData,
  ): Promise<bigint> {
    const tx = await this.client.transaction.build.simple({
      sender,
      data,
      options: { maxGasAmount: 2_000_000 },
    })
    const dummyPubKey = new Ed25519PublicKey('0x' + '00'.repeat(32))
    const [sim] = await this.client.transaction.simulate.simple({
      signerPublicKey: dummyPubKey,
      transaction: tx,
      options: { estimateGasUnitPrice: true, estimateMaxGasAmount: true },
    })
    // sim.max_gas_amount with estimateMaxGasAmount=true is the AFFORDABILITY ceiling
    // (sender balance / gas_unit_price), NOT a recommendation. The real consumption is
    // sim.gas_used. Apply the Aptos CLI 1.5x safety factor, capped by affordability.
    const gasUsed = BigInt(sim?.gas_used ?? 0)
    if (gasUsed === 0n) return MIN_MAX_GAS_AMOUNT
    const ceiling = BigInt(sim?.max_gas_amount ?? 0)
    const withBuffer = (gasUsed * 3n) / 2n
    const recommended = ceiling > 0n && ceiling < withBuffer ? ceiling : withBuffer
    return recommended > MIN_MAX_GAS_AMOUNT ? recommended : MIN_MAX_GAS_AMOUNT
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.AptosMainnet>,
  ): Promise<SignTx<KnownChainIds.AptosMainnet>> {
    try {
      const { from, accountNumber, to, value } = input

      const data: InputEntryFunctionData = {
        function: '0x1::aptos_account::transfer_coins',
        typeArguments: [APT_COIN_TYPE],
        functionArguments: [to, BigInt(value)],
      }
      const maxGasAmount = Number(await this.estimateMaxGasAmount(from, data))

      const transaction = await this.client.transaction.build.simple({
        sender: from,
        data,
        options: { maxGasAmount },
      })

      const signingMessageBytes = this.client.getSigningMessage({ transaction })
      const rawTransactionBytes = transaction.bcsToBytes()

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        signingMessageBytes,
        rawTransactionBytes,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.AptosMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.AptosMainnet>
  }> {
    try {
      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return { txToSign: { ...txToSign, ...(input.pubKey ? { pubKey: input.pubKey } : {}) } }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(
    signTxInput: SignTxInput<SignTx<KnownChainIds.AptosMainnet>>,
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.aptosSignTx({
        addressNList: txToSign.addressNList,
        signingMessageBytes: txToSign.signingMessageBytes,
        rawTransactionBytes: txToSign.rawTransactionBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      return JSON.stringify({
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
        rawTransactionBytes: Array.from(signedTx.rawTransactionBytes),
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.AptosMainnet>): Promise<string> {
    try {
      const signedTxHex = await this.signTransaction(signTxInput)
      return this.broadcastTransaction({ senderAddress, receiverAddress, hex: signedTxHex })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      const parsed = JSON.parse(hex) as {
        signature: string
        publicKey: string
        rawTransactionBytes: number[]
      }

      const rawBytes = new Uint8Array(parsed.rawTransactionBytes)
      const transaction = SimpleTransaction.deserialize(new Deserializer(rawBytes))

      const publicKey = new Ed25519PublicKey(parsed.publicKey)
      const signature = new Ed25519Signature(parsed.signature)
      const senderAuthenticator = new AccountAuthenticatorEd25519(publicKey, signature)

      const pending = await this.client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      })

      return pending.hash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.AptosMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AptosMainnet>> {
    try {
      const { chainSpecific } = input
      const { from } = chainSpecific

      const { gas_estimate, prioritized_gas_estimate, deprioritized_gas_estimate } =
        await this.client.getGasPriceEstimation()

      let maxGasAmount: string
      try {
        const estimate = await this.estimateMaxGasAmount(from, {
          function: '0x1::aptos_account::transfer_coins',
          typeArguments: [APT_COIN_TYPE],
          functionArguments: [from, 0n],
        })
        maxGasAmount = estimate.toString()
      } catch {
        maxGasAmount = MIN_MAX_GAS_AMOUNT.toString()
      }

      const slowPrice = String(deprioritized_gas_estimate ?? gas_estimate ?? 100)
      const averagePrice = String(gas_estimate ?? 100)
      const fastPrice = String(prioritized_gas_estimate ?? gas_estimate ?? 100)
      const calcTxFee = (price: string) => (BigInt(maxGasAmount) * BigInt(price)).toString()

      return {
        fast: {
          txFee: calcTxFee(fastPrice),
          chainSpecific: {
            gasEstimate: calcTxFee(fastPrice),
            gasUnitPrice: fastPrice,
            maxGasAmount,
          },
        },
        average: {
          txFee: calcTxFee(averagePrice),
          chainSpecific: {
            gasEstimate: calcTxFee(averagePrice),
            gasUnitPrice: averagePrice,
            maxGasAmount,
          },
        },
        slow: {
          txFee: calcTxFee(slowPrice),
          chainSpecific: {
            gasEstimate: calcTxFee(slowPrice),
            gasUnitPrice: slowPrice,
            maxGasAmount,
          },
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  subscribeTxs(): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(): void {
    return
  }

  closeTxs(): void {
    return
  }

  private getPayloadAssetId(payload: {
    function?: string
    type_arguments?: string[]
    arguments?: unknown[]
  }): AssetId | undefined {
    const fn = payload?.function
    if (!fn) return undefined

    if (fn === '0x1::coin::transfer' || fn === '0x1::aptos_account::transfer_coins') {
      const coinType = payload.type_arguments?.[0]
      if (!coinType) return undefined
      if (coinType === APT_COIN_TYPE) return this.assetId
      return toAssetId({
        chainId: this.chainId,
        assetNamespace: ASSET_NAMESPACE.aptosCoin,
        assetReference: coinType,
      })
    }

    if (fn === '0x1::primary_fungible_store::transfer') {
      const metadata = payload.arguments?.[0]
      const ref = typeof metadata === 'string' ? metadata : (metadata as { inner?: string })?.inner
      if (!ref) return undefined
      return toAssetId({
        chainId: this.chainId,
        assetNamespace: ASSET_NAMESPACE.aptosCoin,
        assetReference: ref,
      })
    }

    if (fn === '0x1::aptos_account::transfer') {
      return this.assetId
    }

    return undefined
  }

  async parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    try {
      const tx = (
        typeof txHashOrTx === 'string'
          ? await this.client.transaction.getTransactionByHash({ transactionHash: txHashOrTx })
          : txHashOrTx
      ) as {
        hash?: string
        version?: string | number
        timestamp?: string | number
        success?: boolean
        gas_used?: string
        gas_unit_price?: string
        sender?: string
        payload?: { function?: string; type_arguments?: string[]; arguments?: unknown[] }
      }

      const txid = tx.hash ?? (typeof txHashOrTx === 'string' ? txHashOrTx : '')
      const blockHeight = Number(tx.version ?? 0)
      const blockTime = tx.timestamp ? Math.floor(Number(tx.timestamp) / 1_000_000) : 0

      const status = tx.success === false ? TxStatus.Failed : TxStatus.Confirmed

      const gasUsed = tx.gas_used ?? '0'
      const gasUnitPrice = tx.gas_unit_price ?? '0'
      const fee = {
        assetId: this.assetId,
        value: (BigInt(gasUsed) * BigInt(gasUnitPrice)).toString(),
      }

      const transfers: Transaction['transfers'] = []
      const payload = tx.payload ?? {}
      const transferAssetId = this.getPayloadAssetId(payload)

      if (transferAssetId) {
        const args = payload.arguments ?? []
        const fn = payload.function ?? ''
        const isFaTransfer = fn === '0x1::primary_fungible_store::transfer'
        const recipient = String(args[isFaTransfer ? 1 : 0] ?? '')
        const amount = String(args[isFaTransfer ? 2 : 1] ?? '0')
        const sender = tx.sender ?? ''

        if (sender === pubkey) {
          transfers.push({
            assetId: transferAssetId,
            from: [sender],
            to: [recipient],
            type: TransferType.Send,
            value: amount,
          })
        }
        if (recipient === pubkey) {
          transfers.push({
            assetId: transferAssetId,
            from: [sender],
            to: [recipient],
            type: TransferType.Receive,
            value: amount,
          })
        }
      }

      return {
        txid,
        blockHeight,
        blockTime,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee,
        transfers,
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
