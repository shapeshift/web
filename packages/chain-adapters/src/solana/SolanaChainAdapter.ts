import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  solanaChainId,
  solAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import PQueue from 'p-queue'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION, ValidAddressResultType } from '../types'
import { toAddressNList, toRootDerivationPath } from '../utils'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import { microLamportsToLamports } from './utils'

export interface ChainAdapterArgs {
  providers: {
    http: unchained.solana.Api
    ws: unchained.ws.Client<unchained.solana.Tx>
  }
  rpcUrl: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.SolanaMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Solana),
    accountNumber: 0,
  }

  protected readonly chainId = solanaChainId
  protected readonly assetId = solAssetId

  protected readonly providers: {
    http: unchained.solana.Api
    ws: unchained.ws.Client<unchained.solana.Tx>
  }

  protected connection: Connection
  protected parser: unchained.solana.TransactionParser<unchained.solana.Tx>

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers

    this.connection = new Connection(args.rpcUrl)

    this.parser = new unchained.solana.TransactionParser({
      assetId: this.assetId,
      chainId: this.chainId,
    })
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Solana)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Solana
  }

  getType(): KnownChainIds.SolanaMainnet {
    return KnownChainIds.SolanaMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getBIP44Params({ accountNumber }: GetBIP44ParamsInput): BIP44Params {
    if (accountNumber < 0) {
      throw new Error('accountNumber must be >= 0')
    }
    return { ...ChainAdapter.defaultBIP44Params, accountNumber }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!supportsSolana(wallet)) throw new Error('Wallet does not support Solana.')

      const address = await wallet.solanaGetAddress({
        addressNList: toAddressNList(this.getBIP44Params({ accountNumber })),
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('Unable to generate Solana address.')

      return address
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.SolanaMainnet>> {
    try {
      const data = await this.providers.http.getAccount({ pubkey })

      const balance = BigInt(data.balance) + BigInt(data.unconfirmedBalance)

      return {
        balance: balance.toString(),
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens: data.tokens.map(token => ({
            assetId: toAssetId({
              chainId: this.chainId,
              assetNamespace: ASSET_NAMESPACE.splToken,
              assetReference: token.id,
            }),
            balance: token.balance,
            name: token.name,
            precision: token.decimals,
            symbol: token.symbol,
          })),
        },
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    const requestQueue = input.requestQueue ?? new PQueue()

    try {
      const data = await requestQueue.add(() =>
        this.providers.http.getTxHistory({
          pubkey: input.pubkey,
          pageSize: input.pageSize,
          cursor: input.cursor,
        }),
      )

      const txs = await Promise.all(
        data.txs.map(tx => requestQueue.add(() => this.parseTx(tx, input.pubkey))),
      )

      return {
        cursor: data.cursor ?? '',
        pubkey: input.pubkey,
        transactions: txs,
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.SolanaMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.SolanaMainnet>
  }> {
    try {
      const { accountNumber, to, value, chainSpecific } = input

      const { blockhash } = await this.connection.getLatestBlockhash()

      const computeUnitLimit = chainSpecific.computeUnitLimit
        ? Number(chainSpecific.computeUnitLimit)
        : undefined

      const computeUnitPrice = chainSpecific.computeUnitPrice
        ? Number(chainSpecific.computeUnitPrice)
        : undefined

      const txToSign: SignTx<KnownChainIds.SolanaMainnet> = {
        addressNList: toAddressNList(this.getBIP44Params({ accountNumber })),
        blockHash: blockhash,
        computeUnitLimit,
        computeUnitPrice,
        // TODO: handle extra instructions
        instructions: undefined,
        to,
        value,
      }

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signTransaction(signTxInput: SignTxInput<SolanaSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!supportsSolana(wallet)) throw new Error('Wallet does not support Solana.')

      const signedTx = await wallet.solanaSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.SolanaMainnet>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      if (!supportsSolana(wallet)) throw new Error('Wallet does not support Solana.')

      const tx = await wallet.solanaSendTx?.(txToSign)

      if (!tx) throw new Error('Error signing & broadcasting tx')

      return tx.signature
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      return this.providers.http.sendTx({ sendTxBody: { hex } })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.SolanaMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.SolanaMainnet>> {
    const { baseFee, fast, average, slow } = await this.providers.http.getPriorityFees()

    const serializedTx = this.buildEstimationSerializedTx(input)
    const computeUnits = await this.providers.http.estimateFees({
      estimateFeesBody: { serializedTx },
    })

    return {
      fast: {
        txFee: bn(microLamportsToLamports(fast))
          .times(computeUnits)
          .plus(baseFee)
          .toFixed(0, BigNumber.ROUND_HALF_UP),
        chainSpecific: { computeUnits, priorityFee: fast },
      },
      average: {
        txFee: bn(microLamportsToLamports(average))
          .times(computeUnits)
          .plus(baseFee)
          .toFixed(0, BigNumber.ROUND_HALF_UP),
        chainSpecific: { computeUnits, priorityFee: average },
      },
      slow: {
        txFee: bn(microLamportsToLamports(slow))
          .times(computeUnits)
          .plus(baseFee)
          .toFixed(0, BigNumber.ROUND_HALF_UP),
        chainSpecific: { computeUnits, priorityFee: slow },
      },
    }
  }

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      new PublicKey(address)
      return { valid: true, result: ValidAddressResultType.Valid }
    } catch (err) {
      return { valid: false, result: ValidAddressResultType.Invalid }
    }
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { pubKey, accountNumber, wallet } = input

    const bip44Params = this.getBIP44Params({ accountNumber })
    const address = await this.getAddress({ accountNumber, wallet, pubKey })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      async msg => onMessage(await this.parseTx(msg.data, msg.address)),
      err => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { accountNumber } = input
    const bip44Params = this.getBIP44Params({ accountNumber })
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }

  private buildEstimationSerializedTx(input: GetFeeDataInput<KnownChainIds.SolanaMainnet>): string {
    const instructions = input.chainSpecific.instructions ?? []

    const value = Number(input.value)
    if (!isNaN(value) && value > 0 && input.to) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(input.chainSpecific.from),
          toPubkey: new PublicKey(input.to),
          lamports: value,
        }),
      )
    }

    // max compute unit limit instruction for fee estimation
    instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }))
    // placeholder compute unit price instruction for fee estimation
    instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }))

    const message = new TransactionMessage({
      payerKey: new PublicKey(input.chainSpecific.from),
      instructions,
      // static block hash as fee estimation replaces the block hash with latest to save us a client side call
      recentBlockhash: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn',
    }).compileToV0Message()

    const transaction = new VersionedTransaction(message)

    return Buffer.from(transaction.serialize()).toString('base64')
  }

  private async parseTx(tx: unchained.solana.Tx, pubkey: string): Promise<Transaction> {
    const { address: _, ...parsedTx } = await this.parser.parse(tx, pubkey)

    return {
      ...parsedTx,
      pubkey,
      transfers: parsedTx.transfers.map(transfer => ({
        assetId: transfer.assetId,
        from: [transfer.from],
        to: [transfer.to],
        type: transfer.type,
        value: transfer.totalValue,
      })),
    }
  }
}
