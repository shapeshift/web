import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, tonAssetId, tonChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TonWallet } from '@shapeshiftoss/hdwallet-core'
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
import { toAddressNList, verifyLedgerAppOpen } from '../utils'
import type { TonSignTx } from './types'

const supportsTon = (wallet: HDWallet): wallet is TonWallet => {
  return '_supportsTon' in wallet && (wallet as TonWallet)._supportsTon === true
}

export type ChainAdapterArgs = {
  rpcUrl: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.TonMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ton),
    accountNumber: 0,
  }

  protected readonly chainId = tonChainId
  protected readonly assetId = tonAssetId
  protected readonly rpcUrl: string

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is TonWallet {
    if (!supportsTon(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    return 'TON'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Ton
  }

  getType(): KnownChainIds.TonMainnet {
    return KnownChainIds.TonMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getRpcUrl(): string {
    return this.rpcUrl
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    // TON uses 3-level derivation path: m/44'/607'/<account>'
    return {
      ...ChainAdapter.rootBip44Params,
      accountNumber,
      isChange: undefined,
      addressIndex: undefined,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const address = await wallet.tonGetAddress({
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.TonMainnet>> {
    try {
      // Call TON RPC to get account info
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'getAddressInformation',
          params: { address: pubkey },
        }),
      })

      const data = await response.json()

      if (data.error) {
        // Account not found or not initialized - return 0 balance
        if (
          data.error.message?.includes('not found') ||
          data.error.message?.includes('not initialized')
        ) {
          return {
            balance: '0',
            chainId: this.chainId,
            assetId: this.assetId,
            chain: this.getType(),
            chainSpecific: { tokens: [] },
            pubkey,
          }
        }
        throw new Error(data.error.message || 'Failed to get account info')
      }

      const balance = data.result?.balance ?? '0'

      return {
        balance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: { tokens: [] },
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
    const valid = {
      valid: true,
      result: ValidAddressResultType.Valid,
    } as const
    const invalid = {
      valid: false,
      result: ValidAddressResultType.Invalid,
    } as const

    // TON user-friendly addresses are base64-encoded (48 characters)
    // Format: [flags:1][workchain:1][hash:32][crc:2] = 36 bytes -> 48 base64 chars
    // Can use standard base64 (+/) or url-safe (-_)

    // Raw addresses: workchain:hex_hash format (e.g., "0:abc123...")
    const rawAddressRegex = /^-?\d+:[0-9a-fA-F]{64}$/
    if (rawAddressRegex.test(address)) {
      return Promise.resolve(valid)
    }

    // User-friendly addresses: base64 encoded, 48 characters
    // Standard base64 or url-safe base64
    const userFriendlyRegex = /^[A-Za-z0-9+/_-]{48}$/
    if (userFriendlyRegex.test(address)) {
      return Promise.resolve(valid)
    }

    return Promise.resolve(invalid)
  }

  getTxHistory(): Promise<never> {
    throw new Error('TON transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.TonMainnet>,
  ): Promise<TonSignTx> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const memo = chainSpecific?.memo

      // Get seqno for the sender
      const seqnoResponse = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'runGetMethod',
          params: {
            address: from,
            method: 'seqno',
            stack: [],
          },
        }),
      })

      const seqnoData = await seqnoResponse.json()
      const seqno = seqnoData.result?.stack?.[0]?.[1]
        ? parseInt(seqnoData.result.stack[0][1], 16)
        : 0

      // Build internal message (transfer)
      // This is a simplified representation - actual BOC serialization
      // would need @ton/core library
      const messageData = {
        type: 'transfer',
        from,
        to,
        value,
        seqno,
        ...(memo ? { memo } : {}),
      }

      // Serialize message to bytes for signing
      // In a full implementation, this would use @ton/core to create proper BOC
      const messageBytes = new TextEncoder().encode(JSON.stringify(messageData))

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        message: messageBytes,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.TonMainnet>): Promise<{
    txToSign: TonSignTx
  }> {
    try {
      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return {
        txToSign: {
          ...txToSign,
          ...(input.pubKey ? { pubKey: input.pubKey } : {}),
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(signTxInput: SignTxInput<TonSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.tonSignTx({
        addressNList: txToSign.addressNList,
        message: txToSign.message,
      })

      if (!signedTx?.signature || !signedTx?.serialized) {
        throw new Error('error signing tx - missing signature or serialized data')
      }

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
  }: SignAndBroadcastTransactionInput<KnownChainIds.TonMainnet>): Promise<string> {
    try {
      const signedTx = await this.signTransaction(signTxInput as SignTxInput<TonSignTx>)
      return await this.broadcastTransaction({
        hex: signedTx,
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
      const { hex: signedTx } = input

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'sendBocReturnHash',
          params: { boc: signedTx },
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Failed to broadcast transaction')
      }

      return data.result?.hash || ''
    } catch (err) {
      console.error('[TON broadcastTransaction] error:', err)
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  getFeeData(
    _input: GetFeeDataInput<KnownChainIds.TonMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.TonMainnet>> {
    try {
      // TON has relatively stable fees
      // Standard transfer costs ~0.005-0.01 TON
      // We use a conservative estimate of 0.01 TON (10_000_000 nanoton)
      const estimatedFee = '10000000' // 0.01 TON in nanotons

      return Promise.resolve({
        fast: {
          txFee: estimatedFee,
          chainSpecific: { gasPrice: estimatedFee },
        },
        average: {
          txFee: estimatedFee,
          chainSpecific: { gasPrice: estimatedFee },
        },
        slow: {
          txFee: estimatedFee,
          chainSpecific: { gasPrice: estimatedFee },
        },
      })
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
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'getTransactionByHash',
          params: { hash: txHash },
        }),
      })

      const data = await response.json()

      if (data.error || !data.result) {
        return TxStatus.Unknown
      }

      // Check if transaction is confirmed (has block reference)
      if (data.result.block) {
        return TxStatus.Confirmed
      }

      return TxStatus.Pending
    } catch {
      return TxStatus.Unknown
    }
  }

  async parseTx(txHash: string, pubkey: string): Promise<Transaction> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'getTransactionByHash',
          params: { hash: txHash },
        }),
      })

      const data = await response.json()

      if (data.error || !data.result) {
        throw new Error(`Transaction not found: ${txHash}`)
      }

      const tx = data.result
      const status = tx.block ? TxStatus.Confirmed : TxStatus.Pending

      return {
        txid: txHash,
        blockHeight: tx.block?.seqno ?? 0,
        blockTime: tx.utime ?? 0,
        blockHash: tx.block?.hash,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee: tx.fee
          ? {
              assetId: this.assetId,
              value: tx.fee,
            }
          : undefined,
        transfers: [],
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
