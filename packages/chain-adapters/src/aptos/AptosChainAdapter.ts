import type {
  EntryFunctionABI,
  EntryFunctionPayloadResponse,
  InputEntryFunctionData,
} from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  AccountAuthenticatorEd25519,
  Aptos,
  AptosConfig,
  Deserializer,
  Ed25519PublicKey,
  Ed25519Signature,
  isPendingTransactionResponse,
  isUserTransactionResponse,
  Network,
  parseTypeTag,
  SimpleTransaction,
  TypeTagAddress,
  TypeTagU64,
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

const FA_TRANSFER_FUNCTIONS = [
  '0x1::primary_fungible_store::transfer',
  '0x1::aptos_account::transfer_fungible_assets',
]

// local abis (mirroring the sdk's transfer helpers) skip a remote abi fetch per build
const COIN_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [new TypeTagAddress(), new TypeTagU64()],
}

const FA_TRANSFER_ABI: EntryFunctionABI = {
  typeParameters: [{ constraints: [] }],
  parameters: [parseTypeTag('0x1::object::Object'), new TypeTagAddress(), new TypeTagU64()],
}

const getTransferPayload = (
  to: string,
  value: string,
  contractAddress: string | undefined,
): InputEntryFunctionData => {
  // fungible assets are referenced by metadata address, apt and legacy coins by move struct type
  if (contractAddress && !contractAddress.includes('::')) {
    return {
      function: '0x1::primary_fungible_store::transfer',
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [contractAddress, to, BigInt(value)],
      abi: FA_TRANSFER_ABI,
    }
  }

  return {
    function: '0x1::aptos_account::transfer_coins',
    typeArguments: [contractAddress ?? APT_COIN_TYPE],
    functionArguments: [to, BigInt(value)],
    abi: COIN_TRANSFER_ABI,
  }
}

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
          assetNamespace: entry.asset_type.includes('::')
            ? ASSET_NAMESPACE.aptosCoin
            : ASSET_NAMESPACE.aptosFungible,
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
      AccountAddress.fromString(address)
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
    const transaction = await this.client.transaction.build.simple({ sender, data })

    // caps simulated gas at what the sender can afford, so the default cap can't fail the simulation
    const [sim] = await this.client.transaction.simulate.simple({
      transaction,
      options: { estimateGasUnitPrice: true, estimateMaxGasAmount: true },
    })

    if (!sim?.success) throw new Error(`transaction simulation failed: ${sim?.vm_status}`)

    // 50% headroom on simulated gas
    return (BigInt(sim.gas_used) * 3n) / 2n
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.AptosMainnet>,
  ): Promise<SignTx<KnownChainIds.AptosMainnet>> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const { contractAddress, gasUnitPrice, maxGasAmount } = chainSpecific

      const transaction = await this.client.transaction.build.simple({
        sender: from,
        data: getTransferPayload(to, value, contractAddress),
        options: { gasUnitPrice: Number(gasUnitPrice), maxGasAmount: Number(maxGasAmount) },
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
      const { to, value, chainSpecific } = input
      const { from, contractAddress } = chainSpecific

      const [{ gas_estimate, prioritized_gas_estimate, deprioritized_gas_estimate }, maxGasAmount] =
        await Promise.all([
          this.client.getGasPriceEstimation(),
          this.estimateMaxGasAmount(from, getTransferPayload(to, value, contractAddress)),
        ])

      const toFeeData = (gasUnitPrice: number) => ({
        txFee: (maxGasAmount * BigInt(gasUnitPrice)).toString(),
        chainSpecific: {
          gasUnitPrice: gasUnitPrice.toString(),
          maxGasAmount: maxGasAmount.toString(),
        },
      })

      return {
        fast: toFeeData(prioritized_gas_estimate ?? gas_estimate),
        average: toFeeData(gas_estimate),
        slow: toFeeData(deprioritized_gas_estimate ?? gas_estimate),
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

  private getPayloadAssetId(payload: EntryFunctionPayloadResponse): AssetId | undefined {
    const fn = payload.function

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

    if (FA_TRANSFER_FUNCTIONS.includes(fn)) {
      const metadata = payload.arguments?.[0]
      const ref = typeof metadata === 'string' ? metadata : (metadata as { inner?: string })?.inner
      if (!ref) return undefined
      return toAssetId({
        chainId: this.chainId,
        assetNamespace: ASSET_NAMESPACE.aptosFungible,
        assetReference: ref,
      })
    }

    if (fn === '0x1::aptos_account::transfer') {
      return this.assetId
    }

    return undefined
  }

  async parseTx(txHash: unknown, pubkey: string): Promise<Transaction> {
    try {
      if (typeof txHash !== 'string') {
        throw new Error(`parseTx expects a string tx hash, got ${typeof txHash}`)
      }

      const tx = await this.client.transaction.getTransactionByHash({ transactionHash: txHash })

      const isUserTx = isUserTransactionResponse(tx)
      if (!isUserTx && !isPendingTransactionResponse(tx)) {
        throw new Error(`unsupported transaction type: ${tx.type}`)
      }

      const status = isUserTx
        ? tx.success
          ? TxStatus.Confirmed
          : TxStatus.Failed
        : TxStatus.Pending

      const fee = {
        assetId: this.assetId,
        value: isUserTx ? (BigInt(tx.gas_used) * BigInt(tx.gas_unit_price)).toString() : '0',
      }

      const transfers: Transaction['transfers'] = []
      const payload = 'function' in tx.payload ? tx.payload : undefined
      const transferAssetId = payload && this.getPayloadAssetId(payload)

      if (payload && transferAssetId) {
        const args = payload.arguments
        const isFaTransfer = FA_TRANSFER_FUNCTIONS.includes(payload.function)
        const recipient = String(args[isFaTransfer ? 1 : 0] ?? '')
        const amount = String(args[isFaTransfer ? 2 : 1] ?? '0')
        const sender = tx.sender

        // Aptos addresses may differ in casing/length but refer to the same account.
        // Use SDK normalization via AccountAddress for reliable equality.
        const eq = (a: string, b: string) => {
          try {
            return AccountAddress.fromString(a).equals(AccountAddress.fromString(b))
          } catch {
            return false
          }
        }

        if (eq(sender, pubkey)) {
          transfers.push({
            assetId: transferAssetId,
            from: [sender],
            to: [recipient],
            type: TransferType.Send,
            value: amount,
          })
        }
        if (eq(recipient, pubkey)) {
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
        txid: tx.hash,
        blockHeight: isUserTx ? Number(tx.version) : 0,
        // aptos timestamps are in microseconds
        blockTime: isUserTx ? Math.floor(Number(tx.timestamp) / 1_000_000) : 0,
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
