import { KeyType, PublicKey } from '@near-js/crypto'
import {
  actionCreators,
  createTransaction,
  Signature,
  SignedTransaction,
} from '@near-js/transactions'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, nearAssetId, nearChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import bs58 from 'bs58'

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
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'
import type { NearSignTx } from './types'

interface NearWallet extends HDWallet {
  nearGetAddress(params: { addressNList: number[]; showDisplay?: boolean }): Promise<string | null>
  nearSignTx(params: {
    addressNList: number[]
    txBytes: Uint8Array
  }): Promise<{ signature: string; publicKey: string } | null>
}

const supportsNear = (wallet: HDWallet): wallet is NearWallet => {
  return '_supportsNear' in wallet && (wallet as any)._supportsNear === true
}

export interface ChainAdapterArgs {
  rpcUrl: string
}

interface NearRpcResponse<T> {
  jsonrpc: string
  id: string
  result?: T
  error?: {
    name: string
    cause?: {
      name: string
      info?: Record<string, unknown>
    }
    message?: string
    data?: string
  }
}

interface NearAccountResult {
  amount: string
  block_hash: string
  block_height: number
  code_hash: string
  locked: string
  storage_paid_at: number
  storage_usage: number
}

interface NearGasPriceResult {
  gas_price: string
}

interface NearAccessKeyResult {
  block_hash: string
  block_height: number
  nonce: number
  permission: string | { FunctionCall: unknown }
}

interface NearBroadcastResult {
  status: {
    SuccessValue?: string
    Failure?: unknown
  }
  transaction: {
    hash: string
    signer_id: string
    receiver_id: string
  }
  transaction_outcome: {
    block_hash: string
    outcome: {
      gas_burnt: number
      tokens_burnt: string
    }
  }
}

interface NearFullTxResult {
  status: { SuccessValue?: string; Failure?: unknown }
  transaction: {
    hash: string
    signer_id: string
    receiver_id: string
    actions: (
      | { Transfer: { deposit: string } }
      | { FunctionCall: { method_name: string; args: string; deposit: string } }
      | { Delegate: unknown }
      | { CreateAccount: unknown }
      | { DeployContract: unknown }
      | { Stake: unknown }
      | { AddKey: unknown }
      | { DeleteKey: unknown }
      | { DeleteAccount: unknown }
    )[]
    public_key: string
  }
  transaction_outcome: {
    block_hash: string
    outcome: {
      tokens_burnt: string
      receipt_ids: string[]
    }
  }
  receipts_outcome: {
    id: string
    outcome: {
      tokens_burnt: string
      logs: string[]
    }
  }[]
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.NearMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Near),
    accountNumber: 0,
  }

  protected readonly chainId = nearChainId
  protected readonly assetId = nearAssetId
  protected readonly rpcUrl: string

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is NearWallet {
    if (!supportsNear(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  private async rpcCall<T>(method: string, params: unknown): Promise<T> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method,
        params,
      }),
    })

    const data = (await response.json()) as NearRpcResponse<T>

    if (data.error) {
      const errorDetail =
        data.error.data ?? data.error.cause?.name ?? data.error.message ?? data.error.name
      throw new Error(typeof errorDetail === 'string' ? errorDetail : 'NEAR RPC error')
    }

    if (data.result === undefined) {
      throw new Error('NEAR RPC returned no result')
    }

    return data.result
  }

  getName() {
    return 'NEAR'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Near
  }

  getType(): KnownChainIds.NearMainnet {
    return KnownChainIds.NearMainnet
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

      const address = await wallet.nearGetAddress({
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.NearMainnet>> {
    try {
      const accountResult = await this.rpcCall<NearAccountResult>('query', {
        request_type: 'view_account',
        finality: 'final',
        account_id: pubkey,
      })

      return {
        balance: accountResult.amount,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens: [],
        },
        pubkey,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('does not exist') || errorMessage.includes('UNKNOWN_ACCOUNT')) {
        return {
          balance: '0',
          chainId: this.chainId,
          assetId: this.assetId,
          chain: this.getType(),
          chainSpecific: {
            tokens: [],
          },
          pubkey,
        }
      }

      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      const isImplicitAccount = /^[0-9a-f]{64}$/.test(address)
      const isNamedAccount = /^[a-z0-9._-]+$/.test(address) && address.length <= 64

      if (isImplicitAccount || isNamedAccount) {
        return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
      }

      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    } catch {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  getTxHistory(): Promise<never> {
    throw new Error('NEAR transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.NearMainnet>,
  ): Promise<NearSignTx> {
    try {
      const { from, accountNumber, to, value } = input

      // Convert hex public key to bytes and create PublicKey using standard NEAR format
      const pubKeyBytes = Buffer.from(from, 'hex')
      const pubKeyBase58 = bs58.encode(pubKeyBytes)
      const publicKey = PublicKey.fromString(`ed25519:${pubKeyBase58}`)

      // Get current nonce from access key
      const accessKeyResult = await this.rpcCall<NearAccessKeyResult>('query', {
        request_type: 'view_access_key',
        finality: 'final',
        account_id: from,
        public_key: `ed25519:${pubKeyBase58}`,
      })

      const nonce = BigInt(accessKeyResult.nonce + 1)

      // Get latest block hash for transaction
      const statusResult = await this.rpcCall<{ sync_info: { latest_block_hash: string } }>(
        'status',
        [],
      )
      const blockHashBase58 = statusResult.sync_info.latest_block_hash
      const blockHash = bs58.decode(blockHashBase58)

      // Build transfer action
      const actions = [actionCreators.transfer(BigInt(value))]

      // Create transaction using @near-js/transactions
      const transaction = createTransaction(from, publicKey, to, nonce, actions, blockHash)

      // Borsh-encode the transaction
      const txBytes = transaction.encode()

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        transaction,
        txBytes,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.NearMainnet>): Promise<{
    txToSign: NearSignTx
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

  async signTransaction(signTxInput: SignTxInput<NearSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      // Pass Borsh-encoded transaction bytes to hdwallet for signing
      const signedTx = await wallet.nearSignTx({
        addressNList: txToSign.addressNList,
        txBytes: txToSign.txBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      // Convert hex signature to bytes (64 bytes for Ed25519)
      const signatureBytes = Buffer.from(signedTx.signature, 'hex')

      // Create ED25519Signature for NEAR
      class ED25519Signature {
        keyType = KeyType.ED25519
        data: Uint8Array
        constructor(data: Uint8Array) {
          this.data = data
        }
      }

      // Build Signature wrapper
      const signature = new Signature(new ED25519Signature(signatureBytes))

      // Build SignedTransaction
      const signedTransaction = new SignedTransaction({
        transaction: txToSign.transaction,
        signature,
      })

      // Borsh-encode the signed transaction and return as base64
      const signedTxBytes = signedTransaction.encode()
      const signedTxBase64 = Buffer.from(signedTxBytes).toString('base64')

      return signedTxBase64
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
  }: SignAndBroadcastTransactionInput<KnownChainIds.NearMainnet>): Promise<string> {
    try {
      const signedTxBase64 = await this.signTransaction(signTxInput as SignTxInput<NearSignTx>)
      return await this.broadcastTransaction({
        hex: signedTxBase64,
        senderAddress,
        receiverAddress,
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex: signedTxBase64 } = input

      // NEAR RPC expects base64-encoded signed transaction
      const result = await this.rpcCall<NearBroadcastResult>('broadcast_tx_commit', [
        signedTxBase64,
      ])

      return result.transaction.hash
    } catch (err) {
      console.error('[NEAR broadcastTransaction] error:', err)
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    _input: GetFeeDataInput<KnownChainIds.NearMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.NearMainnet>> {
    try {
      const gasPriceResult = await this.rpcCall<NearGasPriceResult>('gas_price', [null])

      const gasPrice = gasPriceResult.gas_price

      // Typical transfer uses ~2.5 TGas (2.5e12 gas units)
      const estimatedGas = 2_500_000_000_000n
      const gasPriceBigInt = BigInt(gasPrice)

      const txFee = (estimatedGas * gasPriceBigInt).toString()

      return {
        fast: {
          txFee,
          chainSpecific: { gasPrice },
        },
        average: {
          txFee,
          chainSpecific: { gasPrice },
        },
        slow: {
          txFee,
          chainSpecific: { gasPrice },
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

  async getTransactionStatus(txHash: string): Promise<TxStatus> {
    try {
      const result = await this.rpcCall<{
        status: { SuccessValue?: string; Failure?: unknown }
      }>('tx', [txHash, 'dontcare'])

      if (result.status.SuccessValue !== undefined) {
        return TxStatus.Confirmed
      }
      if (result.status.Failure) {
        return TxStatus.Failed
      }
      return TxStatus.Pending
    } catch {
      return TxStatus.Unknown
    }
  }

  async parseTx(txHash: string, pubkey: string): Promise<Transaction> {
    try {
      const result = await this.rpcCall<NearFullTxResult>('tx', [txHash, 'dontcare'])

      const status = (() => {
        if (result.status.SuccessValue !== undefined) return TxStatus.Confirmed
        if (result.status.Failure) return TxStatus.Failed
        return TxStatus.Pending
      })()

      const tx = result.transaction
      const sender = tx.signer_id
      const receiver = tx.receiver_id
      const blockHash = result.transaction_outcome.block_hash

      const totalTokensBurnt =
        BigInt(result.transaction_outcome.outcome.tokens_burnt) +
        result.receipts_outcome.reduce(
          (sum, receipt) => sum + BigInt(receipt.outcome.tokens_burnt),
          0n,
        )

      const fee = {
        assetId: this.assetId,
        value: totalTokensBurnt.toString(),
      }

      const transfers: {
        assetId: string
        from: string[]
        to: string[]
        type: TransferType
        value: string
      }[] = []

      for (const action of tx.actions) {
        if ('Transfer' in action) {
          const deposit = action.Transfer.deposit
          const isSend = sender === pubkey
          const isReceive = receiver === pubkey

          if (isSend) {
            transfers.push({
              assetId: this.assetId,
              from: [sender],
              to: [receiver],
              type: TransferType.Send,
              value: deposit,
            })
          }
          if (isReceive) {
            transfers.push({
              assetId: this.assetId,
              from: [sender],
              to: [receiver],
              type: TransferType.Receive,
              value: deposit,
            })
          }
        }
      }

      const nep141Transfers = this.parseNep141Transfers(result, pubkey)
      transfers.push(...nep141Transfers)

      return {
        txid: txHash,
        blockHeight: 0,
        blockTime: Math.floor(Date.now() / 1000),
        blockHash,
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

  private parseNep141Transfers(
    result: NearFullTxResult,
    pubkey: string,
  ): {
    assetId: string
    from: string[]
    to: string[]
    type: TransferType
    value: string
  }[] {
    const transfers: {
      assetId: string
      from: string[]
      to: string[]
      type: TransferType
      value: string
    }[] = []

    let tokenContractId = result.transaction.receiver_id
    for (const action of result.transaction.actions) {
      if ('FunctionCall' in action) {
        const method = action.FunctionCall.method_name
        if (method === 'ft_transfer' || method === 'ft_transfer_call') {
          break
        }
      }
      if ('Delegate' in action) {
        const delegateAction = action.Delegate as {
          delegate_action?: { receiver_id?: string; actions?: unknown[] }
        }
        if (delegateAction.delegate_action?.receiver_id) {
          tokenContractId = delegateAction.delegate_action.receiver_id
        }
      }
    }

    for (const receipt of result.receipts_outcome) {
      for (const log of receipt.outcome.logs) {
        if (!log.startsWith('EVENT_JSON:')) continue

        try {
          const eventJson = JSON.parse(log.slice('EVENT_JSON:'.length))
          if (eventJson.standard !== 'nep141') continue
          if (eventJson.event !== 'ft_transfer') continue

          for (const data of eventJson.data || []) {
            const from = data.old_owner_id
            const to = data.new_owner_id
            const amount = data.amount

            if (!from || !to || !amount) continue

            const isSend = from === pubkey
            const isReceive = to === pubkey

            if (isSend) {
              transfers.push({
                assetId: `${this.chainId}/nep141:${tokenContractId}`,
                from: [from],
                to: [to],
                type: TransferType.Send,
                value: amount,
              })
            }
            if (isReceive) {
              transfers.push({
                assetId: `${this.chainId}/nep141:${tokenContractId}`,
                from: [from],
                to: [to],
                type: TransferType.Receive,
                value: amount,
              })
            }
          }
        } catch {
          continue
        }
      }
    }

    return transfers
  }
}
