import { KeyType, PublicKey } from '@near-js/crypto'
import { FailoverRpcProvider, JsonRpcProvider } from '@near-js/providers'
import {
  actionCreators,
  createTransaction,
  Signature,
  SignedTransaction,
} from '@near-js/transactions'
import { baseDecode, baseEncode } from '@near-js/utils'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  nearAssetId,
  nearChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
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
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList, verifyLedgerAppOpen } from '../utils'
import type { NearSignTx } from './types'

interface NearWallet extends HDWallet {
  nearGetAddress(params: { addressNList: number[]; showDisplay?: boolean }): Promise<string | null>
  nearSignTx(params: {
    addressNList: number[]
    txBytes: Uint8Array
  }): Promise<{ signature: string; publicKey: string } | null>
}

interface NearBlocksFtMeta {
  name: string
  symbol: string
  decimals: number
  icon: string | null
  reference: string | null
  price: string | null
}

interface NearBlocksFtBalance {
  contract: string
  amount: string
  ft_meta: NearBlocksFtMeta
}

interface NearBlocksInventoryResponse {
  fts: NearBlocksFtBalance[]
}

const supportsNear = (wallet: HDWallet): wallet is NearWallet => {
  return '_supportsNear' in wallet && (wallet as any)._supportsNear === true
}

export interface ChainAdapterArgs {
  rpcUrls: string[]
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

interface NearAccessKeyResult {
  block_hash: string
  block_height: number
  nonce: number
  permission: string | { FunctionCall: unknown }
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

const NEARBLOCKS_API_URL = 'https://api.nearblocks.io/v1'

export class ChainAdapter implements IChainAdapter<KnownChainIds.NearMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Near),
    accountNumber: 0,
  }

  protected readonly chainId = nearChainId
  protected readonly assetId = nearAssetId
  private readonly provider: FailoverRpcProvider

  constructor(args: ChainAdapterArgs) {
    if (args.rpcUrls.length === 0) {
      throw new Error('NearChainAdapter requires at least one RPC URL')
    }
    // FailoverRpcProvider automatically switches between RPC providers on failure
    const providers = args.rpcUrls.map(url => new JsonRpcProvider({ url }))
    this.provider = new FailoverRpcProvider(providers)
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is NearWallet {
    if (!supportsNear(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
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

      await verifyLedgerAppOpen(this.chainId, wallet)

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

  private async fetchTokenBalances(accountId: string): Promise<
    {
      assetId: AssetId
      balance: string
      name: string
      precision: number
      symbol: string
    }[]
  > {
    try {
      const response = await fetch(`${NEARBLOCKS_API_URL}/account/${accountId}/inventory`)
      if (!response.ok) {
        console.warn(`Failed to fetch NEAR token balances: ${response.status}`)
        return []
      }

      const data = (await response.json()) as { inventory: NearBlocksInventoryResponse }
      const fts = data.inventory?.fts ?? []

      return fts.map(ft => ({
        assetId: toAssetId({
          chainId: this.chainId,
          assetNamespace: ASSET_NAMESPACE.nep141,
          assetReference: ft.contract,
        }),
        balance: ft.amount,
        name: ft.ft_meta.name,
        precision: ft.ft_meta.decimals,
        symbol: ft.ft_meta.symbol,
      }))
    } catch (err) {
      console.warn('Failed to fetch NEAR token balances:', err)
      return []
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.NearMainnet>> {
    try {
      const [accountResult, tokens] = await Promise.all([
        this.provider.query<NearAccountResult>({
          request_type: 'view_account',
          finality: 'final',
          account_id: pubkey,
        }),
        this.fetchTokenBalances(pubkey),
      ])

      return {
        balance: accountResult.amount,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens,
        },
        pubkey,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorType = (err as { type?: string }).type

      // Handle non-existent accounts (implicit accounts that haven't received funds yet)
      // FailoverRpcProvider wraps errors: when all providers fail with "account doesn't exist",
      // it throws "Exceeded N providers" with type "RetriesExceeded" - original error is lost
      if (
        errorMessage.includes("doesn't exist") ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('UNKNOWN_ACCOUNT') ||
        errorMessage.includes('Exceeded') ||
        errorType === 'RetriesExceeded'
      ) {
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
      const { from, accountNumber, to, value, chainSpecific } = input
      const contractAddress = chainSpecific?.contractAddress
      const memo = chainSpecific?.memo

      // Convert hex public key to bytes and create PublicKey using standard NEAR format
      const pubKeyBytes = Buffer.from(from, 'hex')
      const pubKeyBase58 = baseEncode(pubKeyBytes)
      const publicKey = PublicKey.fromString(`ed25519:${pubKeyBase58}`)

      // Get current nonce from access key
      const accessKeyResult = await this.provider.query<NearAccessKeyResult>({
        request_type: 'view_access_key',
        finality: 'final',
        account_id: from,
        public_key: `ed25519:${pubKeyBase58}`,
      })

      const nonce = BigInt(accessKeyResult.nonce + 1)

      // Get latest block hash for transaction
      const statusResult = await this.provider.status()
      const blockHashBase58 = statusResult.sync_info.latest_block_hash
      const blockHash = baseDecode(blockHashBase58)

      // Build action based on transfer type
      const isTokenTransfer = !!contractAddress

      // Constants for NEP-141 token transfers
      const STORAGE_DEPOSIT_AMOUNT = BigInt('1250000000000000000000') // 0.00125 NEAR for storage
      const FT_TRANSFER_GAS = BigInt(30_000_000_000_000) // 30 TGas
      const STORAGE_DEPOSIT_GAS = BigInt(30_000_000_000_000) // 30 TGas
      const ONE_YOCTO = BigInt(1)

      const actions = isTokenTransfer
        ? [
            // Action 1: Register recipient with storage_deposit
            // If already registered, the deposit is refunded to sender
            actionCreators.functionCall(
              'storage_deposit',
              {
                account_id: to,
                registration_only: true, // Only pay for registration, refund excess
              },
              STORAGE_DEPOSIT_GAS,
              STORAGE_DEPOSIT_AMOUNT,
            ),
            // Action 2: NEP-141 ft_transfer
            actionCreators.functionCall(
              'ft_transfer',
              {
                receiver_id: to,
                amount: value,
                ...(memo ? { memo } : {}),
              },
              FT_TRANSFER_GAS,
              ONE_YOCTO, // 1 yoctoNEAR deposit required for ft_transfer
            ),
          ]
        : [actionCreators.transfer(BigInt(value))]

      // For token transfers, the receiver is the contract; for native, it's the recipient
      const transactionReceiver = isTokenTransfer ? contractAddress : to

      // Create transaction using @near-js/transactions
      const transaction = createTransaction(
        from,
        publicKey,
        transactionReceiver,
        nonce,
        actions,
        blockHash,
      )

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

      await verifyLedgerAppOpen(this.chainId, wallet)

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

      // Decode base64 to SignedTransaction for the provider
      const signedTxBytes = Buffer.from(signedTxBase64, 'base64')
      const signedTransaction = SignedTransaction.decode(signedTxBytes)

      // sendTransaction waits for the transaction to be included (broadcast_tx_commit)
      const result = await this.provider.sendTransaction(signedTransaction)

      // Check for failures - status can be object (FinalExecutionStatus) or string (FinalExecutionStatusBasic)
      const status = result.status
      const isFailure =
        status === 'Failure' ||
        (typeof status === 'object' && status !== null && 'Failure' in status)

      if (isFailure) {
        const failureInfo = typeof status === 'object' ? status : { status }
        console.error('[NEAR broadcastTransaction] Transaction failed:', failureInfo)
        throw new Error(`Transaction failed: ${JSON.stringify(failureInfo)}`)
      }

      return result.transaction.hash
    } catch (err) {
      console.error('[NEAR broadcastTransaction] error:', err)
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.NearMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.NearMainnet>> {
    try {
      const gasPriceResult = await this.provider.gasPrice(null)

      const gasPrice = gasPriceResult.gas_price

      // TODO(gomes): actual gas estimates from RPC simulation
      // Token transfers include storage_deposit (30 TGas) + ft_transfer (30 TGas) = 60 TGas
      // Plus 0.00125 NEAR for storage deposit (refunded if recipient already registered)
      const isTokenTransfer = !!input.chainSpecific?.contractAddress
      const estimatedGas = isTokenTransfer
        ? 60_000_000_000_000n // 60 TGas for storage_deposit + ft_transfer batch
        : 2_500_000_000_000n // 2.5 TGas for native transfers
      const gasPriceBigInt = BigInt(gasPrice)

      // For token transfers, add storage deposit amount (may be refunded)
      const storageDeposit = isTokenTransfer ? BigInt('1250000000000000000000') : 0n
      const txFee = ((estimatedGas * gasPriceBigInt) + storageDeposit).toString()

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

  // I swear I didn't invent this, even NEAR docs use 'dontcare': https://docs.near.org/api/rpc/transactions
  async getTransactionStatus(txHash: string, accountId = 'dontcare'): Promise<TxStatus> {
    try {
      const result = await this.provider.txStatus(txHash, accountId, 'FINAL')
      const status = result.status

      // status can be object (FinalExecutionStatus) or string (FinalExecutionStatusBasic)
      if (typeof status === 'object' && status !== null) {
        if ('SuccessValue' in status) return TxStatus.Confirmed
        if ('Failure' in status) return TxStatus.Failed
      } else if (status === 'Failure') {
        return TxStatus.Failed
      }

      return TxStatus.Pending
    } catch {
      return TxStatus.Unknown
    }
  }

  async parseTx(txHash: string, pubkey: string): Promise<Transaction> {
    try {
      // Use pubkey as sender account ID for tx lookup (or 'dontcare' if not available)
      const result = (await this.provider.txStatus(
        txHash,
        pubkey || 'dontcare',
        'FINAL',
      )) as unknown as NearFullTxResult

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
