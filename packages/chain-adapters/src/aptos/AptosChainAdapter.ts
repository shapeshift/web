import type { InputEntryFunctionData, PendingTransactionResponse } from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  Aptos,
  AptosConfig,
  Deserializer,
  Ed25519PublicKey,
  Ed25519Signature,
  Hex,
  isPendingTransactionResponse,
  isUserTransactionResponse,
  MimeType,
  Network,
  postAptosFullNode,
  RawTransaction,
  SignedTransaction,
  TransactionAuthenticatorEd25519,
} from '@aptos-labs/ts-sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { aptosAssetId, aptosChainId, ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import type { AptosWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsAptos } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

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
import { APT_COIN_TYPE } from './constants'
import { parseAptosTx } from './parser'
import type { AptosToken } from './types'
import { getTokenAssetNamespace, getTransferPayload } from './utils'

export interface ChainAdapterArgs {
  rpcUrl: string
  indexerUrl: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.AptosMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Aptos),
    accountNumber: 0,
  }

  protected readonly chainId = aptosChainId
  protected readonly assetId = aptosAssetId
  protected readonly client: Aptos

  constructor(args: ChainAdapterArgs) {
    this.client = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        fullnode: `${args.rpcUrl}/v1`,
        indexer: `${args.indexerUrl}/v1/graphql`,
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
    return ChainAdapterDisplayName.Aptos
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Aptos
  }

  getAptosClient(): Aptos {
    return this.client
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
          assetNamespace: getTokenAssetNamespace(entry.asset_type),
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
      // user accounts are always the long form; reserved framework addresses (0x0-0xf) can't safely receive funds
      if (AccountAddress.fromStringStrict(address).isSpecial()) {
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

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        rawTransactionBytes: transaction.rawTransaction.bcsToBytes(),
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

      return { txToSign }
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
        rawTransactionBytes: txToSign.rawTransactionBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      const signedTransaction = new SignedTransaction(
        RawTransaction.deserialize(new Deserializer(txToSign.rawTransactionBytes)),
        new TransactionAuthenticatorEd25519(
          new Ed25519PublicKey(signedTx.publicKey),
          new Ed25519Signature(signedTx.signature),
        ),
      )

      return signedTransaction.bcsToHex().toString()
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
      const hex = await this.signTransaction(signTxInput)
      return this.broadcastTransaction({ senderAddress, receiverAddress, hex })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { data } = await postAptosFullNode<Uint8Array, PendingTransactionResponse>({
        aptosConfig: this.client.config,
        path: 'transactions',
        originMethod: 'broadcastTransaction',
        contentType: MimeType.BCS_SIGNED_TRANSACTION,
        body: Hex.fromHexInput(input.hex).toUint8Array(),
      })

      return data.hash
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
      const { to, value, chainSpecific, sendMax } = input
      const { from, contractAddress } = chainSpecific

      // a full balance apt send can't cover gas in simulation, and gas doesn't depend on the amount
      const simulatedValue = sendMax && !contractAddress ? '1' : value

      const [{ gas_estimate, prioritized_gas_estimate, deprioritized_gas_estimate }, maxGasAmount] =
        await Promise.all([
          this.client.getGasPriceEstimation(),
          this.estimateMaxGasAmount(from, getTransferPayload(to, simulatedValue, contractAddress)),
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

  subscribeTxs(): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(): void {
    return
  }

  closeTxs(): void {
    return
  }

  async parseTx(txHash: string, pubkey: string): Promise<Transaction> {
    try {
      const tx = await this.client.transaction.getTransactionByHash({ transactionHash: txHash })

      if (!isUserTransactionResponse(tx) && !isPendingTransactionResponse(tx)) {
        throw new Error(`unsupported transaction type: ${tx.type}`)
      }

      return parseAptosTx(tx, pubkey, this.chainId, this.assetId)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
