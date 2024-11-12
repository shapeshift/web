import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  solanaChainId,
  solAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { SolanaSignTx, SolanaTxInstruction } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token'
import type { TransactionInstruction } from '@solana/web3.js'
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
  BuildSendApiTxInput,
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

// Maximum compute units allowed for a single solana transaction
const MAX_COMPUTE_UNITS = 1400000

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
      api: this.providers.http,
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

  async buildSendApiTransaction(input: BuildSendApiTxInput<KnownChainIds.SolanaMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.SolanaMainnet>
  }> {
    try {
      const { from, accountNumber, to, chainSpecific, value } = input
      const { instructions = [], tokenId } = chainSpecific

      const { blockhash } = await this.connection.getLatestBlockhash()

      const computeUnitLimit = chainSpecific.computeUnitLimit
        ? Number(chainSpecific.computeUnitLimit)
        : undefined

      const computeUnitPrice = chainSpecific.computeUnitPrice
        ? Number(chainSpecific.computeUnitPrice)
        : undefined

      if (tokenId) {
        const tokenTransferInstructions = await this.buildTokenTransferInstructions({
          from,
          to,
          tokenId,
          value,
        })

        instructions.push(
          ...tokenTransferInstructions.map(instruction => this.convertInstruction(instruction)),
        )
      }

      const txToSign: SignTx<KnownChainIds.SolanaMainnet> = {
        addressNList: toAddressNList(this.getBIP44Params({ accountNumber })),
        blockHash: blockhash,
        computeUnitLimit,
        computeUnitPrice,
        instructions,
        to: tokenId ? '' : to,
        value: tokenId ? '' : value,
      }

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.SolanaMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.SolanaMainnet>
  }> {
    try {
      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return txToSign
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

    const serializedTx = await this.buildEstimationSerializedTx(input)
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

  private async buildEstimationSerializedTx(
    input: GetFeeDataInput<KnownChainIds.SolanaMainnet>,
  ): Promise<string> {
    const { to, chainSpecific } = input
    const { from, tokenId, instructions = [] } = chainSpecific

    if (!to) throw new Error(`${this.getName()}ChainAdapter: to is required`)
    if (!input.value) throw new Error(`${this.getName()}ChainAdapter: value is required`)

    const value = Number(input.value)

    if (!isNaN(value) && value > 0) {
      if (tokenId) {
        const tokenTransferInstructions = await this.buildTokenTransferInstructions({
          from,
          to,
          tokenId,
          value: input.value,
        })

        instructions.push(...tokenTransferInstructions)
      } else {
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(from),
            toPubkey: new PublicKey(to),
            lamports: value,
          }),
        )
      }
    }

    // Set compute unit limit to the maximum compute units for the purposes of estimating the compute unit cost of a transaction,
    // ensuring the transaction does not exceed the maximum compute units alotted for a single transaction.
    instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_COMPUTE_UNITS }))

    // placeholder compute unit price instruction for the purposes of estimating the compute unit cost of a transaction
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

  private async buildTokenTransferInstructions({
    from,
    to,
    tokenId,
    value,
  }: {
    from: string
    to: string
    tokenId: string
    value: string
  }): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = []

    const destinationTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(tokenId),
      new PublicKey(to),
    )

    // check if destination token account exists and add creation instruction if it doesn't
    try {
      await getAccount(this.connection, destinationTokenAccount)
    } catch (err) {
      if (
        err instanceof TokenAccountNotFoundError ||
        err instanceof TokenInvalidAccountOwnerError
      ) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            // sender pays for creation of the token account
            new PublicKey(from),
            destinationTokenAccount,
            new PublicKey(to),
            new PublicKey(tokenId),
          ),
        )
      }
    }

    instructions.push(
      createTransferInstruction(
        getAssociatedTokenAddressSync(new PublicKey(tokenId), new PublicKey(from)),
        destinationTokenAccount,
        new PublicKey(from),
        Number(value),
      ),
    )

    return instructions
  }

  private convertInstruction(instruction: TransactionInstruction): SolanaTxInstruction {
    return {
      keys: instruction.keys.map(key => ({
        pubkey: key.pubkey.toString(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      programId: instruction.programId.toString(),
      data: instruction.data,
    }
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
