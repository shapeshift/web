import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  solanaChainId,
  solAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type {
  HDWallet,
  SolanaAddressLookupTableAccountInfo,
  SolanaSignTx,
  SolanaTxInstruction,
  SolanaWallet,
} from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token'
import type { AccountInfo, TransactionInstruction } from '@solana/web3.js'
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import { isUndefined } from 'lodash'
import PQueue from 'p-queue'

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

export const svmChainIds = [KnownChainIds.SolanaMainnet] as const

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
  static readonly rootBip44Params: RootBip44Params = {
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

  private assertSupportsChain(wallet: HDWallet): asserts wallet is SolanaWallet {
    if (!supportsSolana(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
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

  getConnection(): Connection {
    return this.connection
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return {
      ...ChainAdapter.rootBip44Params,
      accountNumber,
      isChange: false,
      addressIndex: undefined,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      this.assertSupportsChain(wallet)

      const address = await wallet.solanaGetAddress({
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
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    try {
      const requestQueue = input.requestQueue ?? new PQueue()

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

      const addressLookupTableAccountInfos = await this.getAddressLookupTableAccounts(
        chainSpecific.addressLookupTableAccounts ?? [],
      )

      const txToSign: SignTx<KnownChainIds.SolanaMainnet> = {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        blockHash: blockhash,
        computeUnitLimit,
        computeUnitPrice,
        instructions,
        to: tokenId ? '' : to,
        value: tokenId ? '' : value,
        addressLookupTableAccountInfos,
      }

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.SolanaMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.SolanaMainnet>
  }> {
    try {
      const from = await this.getAddress(input)
      const tx = await this.buildSendApiTransaction({ ...input, from })

      return tx
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(signTxInput: SignTxInput<SolanaSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      this.assertSupportsChain(wallet)

      const signedTx = await wallet.solanaSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')

      return signedTx.serialized
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
  }: SignAndBroadcastTransactionInput<KnownChainIds.SolanaMainnet>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      this.assertSupportsChain(wallet)

      const tx = await wallet.solanaSendTx?.(txToSign)

      if (!tx) throw new Error('error signing & broadcasting tx')

      return tx.signature
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
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

      const txHash = await this.providers.http.sendTx({ sendTxBody: { hex } })

      return txHash
    } catch (err) {
      if ((err as Error).name === 'ResponseError') {
        const response = await ((err as any).response as Response).json()

        return ErrorHandler(JSON.stringify(response), {
          translation: 'chainAdapters.errors.broadcastTransactionWithMessage',
          options: { message: response.message },
        })
      }

      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.SolanaMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.SolanaMainnet>> {
    try {
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
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
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

    const bip44Params = this.getBip44Params({ accountNumber })
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
    const bip44Params = this.getBip44Params({ accountNumber })
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

    const estimationInstructions = [...instructions]

    const addressLookupTableAccounts = await this.getSolanaAddressLookupTableAccountsInfo(
      chainSpecific.addressLookupTableAccounts ?? [],
    )

    if (isUndefined(input.to)) throw new Error(`${this.getName()}ChainAdapter: to is required`)
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

        estimationInstructions.push(...tokenTransferInstructions)
      } else {
        estimationInstructions.push(
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
    estimationInstructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_COMPUTE_UNITS }),
    )

    // placeholder compute unit price instruction for the purposes of estimating the compute unit cost of a transaction
    estimationInstructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }))

    const message = new TransactionMessage({
      payerKey: new PublicKey(input.chainSpecific.from),
      instructions: estimationInstructions,
      // static block hash as fee estimation replaces the block hash with latest to save us a client side call
      recentBlockhash: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn',
    }).compileToV0Message(addressLookupTableAccounts)

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

    const { instruction, destinationTokenAccount } =
      await this.createAssociatedTokenAccountInstruction({ from, to, tokenId })

    if (instruction) {
      instructions.push(instruction)
    }

    instructions.push(
      createTransferInstruction(
        getAssociatedTokenAddressSync(new PublicKey(tokenId), new PublicKey(from), true),
        destinationTokenAccount,
        new PublicKey(from),
        Number(value),
      ),
    )

    return instructions
  }

  public async createAssociatedTokenAccountInstruction({
    from,
    to,
    tokenId,
  }: {
    from: string
    to: string
    tokenId: string
  }): Promise<{
    instruction?: TransactionInstruction
    destinationTokenAccount: PublicKey
  }> {
    const accountInfo = await this.connection.getAccountInfo(new PublicKey(tokenId))

    const TOKEN_PROGRAM =
      accountInfo?.owner.toString() === TOKEN_2022_PROGRAM_ID.toString()
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID

    const destinationTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(tokenId),
      new PublicKey(to),
      true,
      TOKEN_PROGRAM,
    )

    // check if destination token account exists and add creation instruction if it doesn't
    try {
      await getAccount(this.connection, destinationTokenAccount)
    } catch (err) {
      if (
        err instanceof TokenAccountNotFoundError ||
        err instanceof TokenInvalidAccountOwnerError
      ) {
        return {
          instruction: createAssociatedTokenAccountInstruction(
            // sender pays for creation of the token account
            new PublicKey(from),
            destinationTokenAccount,
            new PublicKey(to),
            new PublicKey(tokenId),
            TOKEN_PROGRAM,
          ),
          destinationTokenAccount,
        }
      }
    }

    return {
      instruction: undefined,
      destinationTokenAccount,
    }
  }

  public convertInstruction(instruction: TransactionInstruction): SolanaTxInstruction {
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

  public async getTxStatus(tx: unchained.solana.Tx, pubkey: string): Promise<unchained.TxStatus> {
    const parsedTx = await this.parseTx(tx, pubkey)

    return parsedTx.status
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

  get httpProvider(): unchained.solana.Api {
    return this.providers.http
  }

  private async getAddressLookupTableAccountsInfo(
    addresses: string[],
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    return await this.connection.getMultipleAccountsInfo(addresses.map(key => new PublicKey(key)))
  }

  private async getSolanaAddressLookupTableAccountsInfo(
    addresses: string[],
  ): Promise<AddressLookupTableAccount[]> {
    const addressLookupTableAccountInfos = await this.getAddressLookupTableAccountsInfo(addresses)

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = addresses[index]
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            new Uint8Array(Buffer.from(accountInfo.data)),
          ),
        })
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<AddressLookupTableAccount>())
  }

  private async getAddressLookupTableAccounts(
    addresses: string[],
  ): Promise<SolanaAddressLookupTableAccountInfo[]> {
    const addressLookupTableAccountInfos = await this.getAddressLookupTableAccountsInfo(addresses)

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = addresses[index]
      if (accountInfo) {
        const addressLookupTableAccount = {
          key: addressLookupTableAddress,
          data: Buffer.from(accountInfo.data),
        }
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<SolanaAddressLookupTableAccountInfo>())
  }
}
