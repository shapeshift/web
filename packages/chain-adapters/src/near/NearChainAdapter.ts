import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, nearAssetId, nearChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

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
    cause: {
      name: string
      info?: Record<string, unknown>
    }
    message?: string
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
      throw new Error(data.error.message ?? data.error.name ?? 'NEAR RPC error')
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
      // Account doesn't exist yet - return zero balance
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('UNKNOWN_ACCOUNT')
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
      // NEAR implicit accounts are 64 character hex strings (lowercase)
      // Named accounts contain letters, numbers, underscores, and periods
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

      // Get current nonce from access key
      const accessKeyResult = await this.rpcCall<NearAccessKeyResult>('query', {
        request_type: 'view_access_key',
        finality: 'final',
        account_id: from,
        public_key: `ed25519:${this.hexToBase58(from)}`,
      })

      const nonce = accessKeyResult.nonce + 1

      // Get latest block hash for transaction
      const statusResult = await this.rpcCall<{ sync_info: { latest_block_hash: string } }>(
        'status',
        [],
      )
      const blockHash = statusResult.sync_info.latest_block_hash

      // Build transaction data
      // Note: Full Borsh serialization is handled by the wallet/hdwallet
      const txData = {
        signerId: from,
        publicKey: from,
        nonce,
        receiverId: to,
        blockHash,
        actions: [
          {
            type: 'Transfer',
            amount: value,
          },
        ],
      }

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        txData,
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

      // The txData contains the transaction info
      // HDWallet will serialize with Borsh and sign
      const signedTx = await wallet.nearSignTx({
        addressNList: txToSign.addressNList,
        txBytes: new Uint8Array(), // Placeholder - actual implementation in hdwallet
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      // Return signed transaction data for broadcasting
      return JSON.stringify({
        ...txToSign.txData,
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
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
  }: SignAndBroadcastTransactionInput<KnownChainIds.NearMainnet>): Promise<string> {
    try {
      const signedTx = await this.signTransaction(signTxInput as SignTxInput<NearSignTx>)
      return await this.broadcastTransaction({ hex: signedTx, senderAddress, receiverAddress })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      const txData = JSON.parse(hex)

      // NEAR expects base64-encoded signed transaction
      // For now, we'll use the async broadcast
      const result = await this.rpcCall<NearBroadcastResult>('broadcast_tx_commit', [
        txData.signedTxBase64,
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

      const gasPrice = gasPriceResult.gas_price // in yoctoNEAR

      // Typical transfer uses ~2.5 TGas (2.5e12 gas units)
      const estimatedGas = 2_500_000_000_000n // 2.5 TGas
      const gasPriceBigInt = BigInt(gasPrice)

      // Fee = gas * gasPrice
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
      // For second-class citizen, we return minimal tx info
      const status = await this.getTransactionStatus(txHash)

      return {
        txid: txHash,
        blockHeight: 0,
        blockTime: Math.floor(Date.now() / 1000),
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee: undefined,
        transfers: [],
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }

  // Helper to convert hex to base58 for NEAR public key format
  private hexToBase58(hex: string): string {
    // NEAR public keys are in format ed25519:<base58>
    // For implicit accounts, the address IS the hex of the public key
    // We need to convert back to base58 for the access key lookup
    // This is a simplified implementation - full base58 encoding needed
    return hex // Placeholder - actual implementation would do base58 encoding
  }
}
