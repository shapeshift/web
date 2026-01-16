import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId, tonAssetId, tonChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TonWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
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
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList, verifyLedgerAppOpen } from '../utils'
import type { TonFeeData, TonSignTx, TonToken } from './types'

const supportsTon = (wallet: HDWallet): wallet is TonWallet => {
  return '_supportsTon' in wallet && (wallet as TonWallet)._supportsTon === true
}

export type ChainAdapterArgs = {
  rpcUrl: string
}

type TonRpcResponse<T> = {
  ok: boolean
  result?: T
  error?: string
}

type TonAccountInfo = {
  balance: string
  state: 'active' | 'uninitialized' | 'frozen'
  code?: string
  data?: string
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
  private requestQueue: PQueue

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
    // Toncenter free tier: ~1 req/sec, but we use 2s to be safe
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 2000,
      concurrency: 1,
    })
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is TonWallet {
    if (!supportsTon(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  private rpcRequest<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return this.requestQueue.add(async () => {
      const maxRetries = 5
      let lastError: Error | undefined

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              method,
              params,
            }),
          })

          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10)
            const backoffDelay = Math.min(retryAfter * 1000, 10000) * Math.pow(1.5, attempt)
            await new Promise(resolve => setTimeout(resolve, backoffDelay))
            continue
          }

          if (response.status === 500 || response.status === 502 || response.status === 503) {
            lastError = new Error(`TON RPC server error: ${response.status}`)
            const backoffDelay = 1000 * Math.pow(2, attempt)
            await new Promise(resolve => setTimeout(resolve, backoffDelay))
            continue
          }

          const data = (await response.json()) as TonRpcResponse<T>

          if (!data.ok && data.error) {
            lastError = new Error(this.formatTonError(data.error))
            if (this.isRetryableError(data.error)) {
              const backoffDelay = 1000 * Math.pow(2, attempt)
              await new Promise(resolve => setTimeout(resolve, backoffDelay))
              continue
            }
            throw lastError
          }

          if (data.result === undefined) {
            throw new Error('TON RPC returned success but no result data')
          }

          return data.result
        } catch (err) {
          if (err instanceof Error && err.message.includes('TON RPC')) {
            throw err
          }
          lastError = err instanceof Error ? err : new Error(String(err))
          if (attempt < maxRetries - 1) {
            const backoffDelay = 1000 * Math.pow(2, attempt)
            await new Promise(resolve => setTimeout(resolve, backoffDelay))
          }
        }
      }

      throw lastError || new Error('Max retries exceeded for TON RPC request')
    }) as Promise<T>
  }

  private formatTonError(error: string): string {
    if (error.includes('INVALID_BAG_OF_CELLS')) {
      return `TON transaction serialization error: ${error}. This may indicate an invalid transaction format.`
    }
    if (error.includes('seqno')) {
      return `TON sequence number error: ${error}. The transaction may be stale or already processed.`
    }
    if (error.includes('not enough balance') || error.includes('insufficient')) {
      return `TON insufficient balance: ${error}`
    }
    return `TON RPC error: ${error}`
  }

  private isRetryableError(error: string): boolean {
    const retryablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'network',
      'temporarily unavailable',
    ]
    const lowerError = error.toLowerCase()
    return retryablePatterns.some(pattern => lowerError.includes(pattern.toLowerCase()))
  }

  private httpApiRequest<T>(endpoint: string): Promise<T> {
    return this.requestQueue.add(async () => {
      const maxRetries = 3
      let lastError: Error | undefined

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const isV3Endpoint = endpoint.startsWith('/api/v3')
        const baseUrl = isV3Endpoint
          ? this.rpcUrl.replace(/\/api\/v2\/jsonRPC$/, '')
          : this.rpcUrl.replace('/jsonRPC', '')
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10)
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          continue
        }

        if (!response.ok) {
          lastError = new Error(`HTTP API error: ${response.status}`)
          continue
        }

        return response.json() as Promise<T>
      }

      throw lastError || new Error('Max retries exceeded')
    }) as Promise<T>
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
      let balance = '0'
      let tokens: TonToken[] = []

      try {
        const accountInfo = await this.rpcRequest<TonAccountInfo>('getAddressInformation', {
          address: pubkey,
        })
        balance = accountInfo.balance ?? '0'
      } catch {
        balance = '0'
      }

      try {
        const jettonsResponse = await this.httpApiRequest<{
          jetton_wallets?: {
            address: string
            balance: string
            jetton: string
          }[]
          address_book?: Record<
            string,
            {
              user_friendly: string
            }
          >
          metadata?: Record<
            string,
            {
              token_info?: {
                name?: string
                symbol?: string
                extra?: {
                  decimals?: string
                }
              }[]
            }
          >
        }>(`/api/v3/jetton/wallets?owner_address=${encodeURIComponent(pubkey)}`)

        if (jettonsResponse.jetton_wallets) {
          const addressBook = jettonsResponse.address_book ?? {}
          const metadata = jettonsResponse.metadata ?? {}

          tokens = jettonsResponse.jetton_wallets
            .filter(jw => jw.balance && jw.balance !== '0')
            .map(jw => {
              const jettonRawAddress = jw.jetton
              const jettonUserFriendly =
                addressBook[jettonRawAddress]?.user_friendly ?? jettonRawAddress
              const jettonMeta = metadata[jettonRawAddress]?.token_info?.[0]
              const precision = jettonMeta?.extra?.decimals
                ? parseInt(jettonMeta.extra.decimals, 10)
                : 9

              const assetId = toAssetId({
                chainId: this.chainId,
                assetNamespace: 'jetton',
                assetReference: jettonUserFriendly,
              })

              return {
                assetId,
                balance: jw.balance,
                symbol: jettonMeta?.symbol ?? '',
                name: jettonMeta?.name ?? '',
                precision,
              }
            })
        }
      } catch (err) {
        console.error('[TON] Error fetching jetton balances:', err)
        tokens = []
      }

      return {
        balance,
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
    const valid = {
      valid: true,
      result: ValidAddressResultType.Valid,
    } as const
    const invalid = {
      valid: false,
      result: ValidAddressResultType.Invalid,
    } as const

    const rawAddressRegex = /^-?\d+:[0-9a-fA-F]{64}$/
    if (rawAddressRegex.test(address)) {
      return Promise.resolve(valid)
    }

    const userFriendlyRegex = /^[A-Za-z0-9+/_-]{48}$/
    if (userFriendlyRegex.test(address)) {
      return Promise.resolve(valid)
    }

    return Promise.resolve(invalid)
  }

  getTxHistory(): Promise<never> {
    throw new Error('TON transaction history not yet implemented')
  }

  async getSeqno(address: string): Promise<number> {
    try {
      const result = await this.rpcRequest<{
        exit_code: number
        stack: [string, string][]
      }>('runGetMethod', {
        address,
        method: 'seqno',
        stack: [],
      })

      if (result.exit_code !== 0) {
        return 0
      }

      if (result.stack?.[0]?.[0] === 'num' && result.stack[0][1]) {
        return parseInt(result.stack[0][1], 16)
      }

      return 0
    } catch {
      return 0
    }
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.TonMainnet>,
  ): Promise<TonSignTx> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const memo = chainSpecific?.memo
      const contractAddress = chainSpecific?.contractAddress

      const seqno = await this.getSeqno(from)

      const messageData = {
        type: contractAddress ? 'jetton_transfer' : 'transfer',
        from,
        to,
        value,
        seqno,
        expireAt: Math.floor(Date.now() / 1000) + 60,
        ...(memo ? { memo } : {}),
        ...(contractAddress ? { contractAddress } : {}),
      }

      const messageBytes = new TextEncoder().encode(JSON.stringify(messageData))

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        message: messageBytes,
        seqno,
        expireAt: messageData.expireAt,
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
        rawMessages: txToSign.rawMessages,
        seqno: txToSign.seqno,
        expireAt: txToSign.expireAt,
      })

      if (!signedTx?.serialized) {
        throw new Error('error signing tx - missing serialized data')
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

      const result = await this.rpcRequest<{ hash: string }>('sendBocReturnHash', {
        boc: signedTx,
      })

      return result.hash ?? ''
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.TonMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.TonMainnet>> {
    try {
      const { chainSpecific } = input
      const contractAddress = chainSpecific?.contractAddress

      let baseFee = '5000000'
      let forwardFee = '0'
      let storageFee = '0'

      try {
        const configResult = await this.rpcRequest<{
          gas_price?: string
          flat_gas_limit?: string
          flat_gas_price?: string
        }>('getConfigParam', { config_id: 20 })

        if (configResult.gas_price) {
          const gasPrice = BigInt(configResult.gas_price)
          const estimatedGas = contractAddress ? BigInt(100000) : BigInt(50000)
          baseFee = (gasPrice * estimatedGas).toString()
        }
      } catch {
        baseFee = contractAddress ? '15000000' : '5000000'
      }

      if (contractAddress) {
        forwardFee = '10000000'
        storageFee = '5000000'
      }

      const totalFee = (BigInt(baseFee) + BigInt(forwardFee) + BigInt(storageFee)).toString()

      const fastFee = ((BigInt(totalFee) * BigInt(150)) / BigInt(100)).toString()
      const slowFee = ((BigInt(totalFee) * BigInt(80)) / BigInt(100)).toString()

      const feeData: TonFeeData = {
        gasPrice: baseFee,
        forwardFee,
        storageFee,
      }

      return {
        fast: {
          txFee: fastFee,
          chainSpecific: feeData,
        },
        average: {
          txFee: totalFee,
          chainSpecific: feeData,
        },
        slow: {
          txFee: slowFee,
          chainSpecific: feeData,
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

  async getTransactionStatus(msgHash: string): Promise<TxStatus> {
    try {
      const result = await this.httpApiRequest<{
        messages?: {
          hash: string
          in_msg_tx_hash?: string
        }[]
      }>(`/api/v3/messages?hash=${encodeURIComponent(msgHash)}`)

      if (!result.messages || result.messages.length === 0) {
        return TxStatus.Pending
      }

      const msg = result.messages[0]
      if (msg.in_msg_tx_hash) {
        return TxStatus.Confirmed
      }

      return TxStatus.Pending
    } catch {
      return TxStatus.Pending
    }
  }

  private normalizeAddress(address: string): string {
    if (!address) return ''
    return address.replace(/^0:/, '').toLowerCase()
  }

  private addressesMatch(addr1: string, addr2: string): boolean {
    return this.normalizeAddress(addr1) === this.normalizeAddress(addr2)
  }

  async parseTx(msgHash: string, pubkey: string): Promise<Transaction> {
    try {
      const msgResult = await this.httpApiRequest<{
        messages?: {
          hash: string
          in_msg_tx_hash?: string
          source?: string
          destination?: string
          value?: string
          created_at?: string
        }[]
      }>(`/api/v3/messages?hash=${encodeURIComponent(msgHash)}`)

      if (!msgResult.messages || msgResult.messages.length === 0) {
        throw new Error('Message not found')
      }

      const msg = msgResult.messages[0]
      const txHash = msg.in_msg_tx_hash

      if (!txHash) {
        return {
          txid: msgHash,
          blockHeight: 0,
          blockTime: 0,
          blockHash: undefined,
          chainId: this.chainId,
          confirmations: 0,
          status: TxStatus.Pending,
          transfers: [],
          pubkey,
        }
      }

      type TonTxMessage = {
        source?: string
        destination?: string
        value?: string
      }

      type TonTxResponse = {
        transactions?: {
          account: string
          hash: string
          lt: string
          now: number
          total_fees: string
          description?: {
            aborted?: boolean
            action?: {
              success?: boolean
            }
          }
          in_msg?: TonTxMessage
          out_msgs?: TonTxMessage[]
        }[]
      }

      const txResult = await this.httpApiRequest<TonTxResponse>(
        `/api/v3/transactions?hash=${encodeURIComponent(txHash)}&limit=1`,
      )

      const tx = txResult.transactions?.[0]
      const isAborted = tx?.description?.aborted ?? false
      const actionSuccess = tx?.description?.action?.success ?? true
      const status = isAborted || !actionSuccess ? TxStatus.Failed : TxStatus.Confirmed

      const transfers: {
        assetId: string
        from: string[]
        to: string[]
        type: TransferType
        value: string
      }[] = []

      if (tx?.in_msg?.value && tx.in_msg.source && tx.in_msg.destination) {
        const value = tx.in_msg.value
        if (BigInt(value) > 0n) {
          const isReceive = this.addressesMatch(tx.in_msg.destination, pubkey)
          const isSend = this.addressesMatch(tx.in_msg.source, pubkey)

          if (isReceive) {
            transfers.push({
              assetId: this.assetId,
              from: [tx.in_msg.source],
              to: [tx.in_msg.destination],
              type: TransferType.Receive,
              value,
            })
          } else if (isSend) {
            transfers.push({
              assetId: this.assetId,
              from: [tx.in_msg.source],
              to: [tx.in_msg.destination],
              type: TransferType.Send,
              value,
            })
          }
        }
      }

      if (tx?.out_msgs) {
        for (const outMsg of tx.out_msgs) {
          if (outMsg.value && outMsg.source && outMsg.destination) {
            const value = outMsg.value
            if (BigInt(value) > 0n) {
              const isSend = this.addressesMatch(outMsg.source, pubkey)
              const isReceive = this.addressesMatch(outMsg.destination, pubkey)

              if (isSend && !isReceive) {
                transfers.push({
                  assetId: this.assetId,
                  from: [outMsg.source],
                  to: [outMsg.destination],
                  type: TransferType.Send,
                  value,
                })
              } else if (isReceive && !isSend) {
                transfers.push({
                  assetId: this.assetId,
                  from: [outMsg.source],
                  to: [outMsg.destination],
                  type: TransferType.Receive,
                  value,
                })
              }
            }
          }
        }
      }

      return {
        txid: msgHash,
        blockHeight: tx ? parseInt(tx.lt, 10) || 0 : 0,
        blockTime: tx?.now || 0,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee: tx?.total_fees
          ? {
              assetId: this.assetId,
              value: tx.total_fees,
            }
          : undefined,
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
