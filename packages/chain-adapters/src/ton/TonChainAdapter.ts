import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId, tonAssetId, tonChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TonWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { base64ToHex, hexToBase64 } from '@shapeshiftoss/utils'
import { Address } from '@ton/core'
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
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList, verifyLedgerAppOpen } from '../utils'
import {
  PARSE_TX_CACHE_TTL_MS,
  TON_REQUEST_QUEUE_INTERVAL_MS,
  TRACE_BATCH_SIZE,
  TRACE_COMPLETION_LT_SPAN,
  TRACE_LT_SEARCH_RANGE,
} from './constants'
import { buildTraceTransfers, parseTonTx } from './parser'
import type {
  ChainAdapterArgs,
  JettonTransferRecord,
  TonAccountInfo,
  TonApiTxResponse,
  TonFeeData,
  TonRpcResponse,
  TonSignTx,
  TonToken,
  TonTrace,
  TonTracesResponse,
  TonTx,
} from './types'
import { addressesMatch, isHexHash, resolveAddresses } from './utils'

const supportsTon = (wallet: HDWallet): wallet is TonWallet => {
  return '_supportsTon' in wallet && (wallet as TonWallet)._supportsTon === true
}

// TTL starts at resolution - pending parses are reused as-is so a queue backlog can't
// trigger duplicate network runs for the same hash
type ParseTxCacheEntry = { resolvedAt?: number; promise: Promise<Transaction> }

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
  private traceNotOwnCache = new Set<string>()
  private parseTxCache = new Map<string, ParseTxCacheEntry>()

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: TON_REQUEST_QUEUE_INTERVAL_MS,
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
    return this.requestQueue.add(
      async () => {
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
      },
      { throwOnTimeout: true },
    )
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
    const lowerError = error.toLowerCase()

    const nonRetryablePatterns = [
      'insufficient',
      'not enough balance',
      'invalid',
      'malformed',
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'seqno',
    ]
    if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
      return false
    }

    const retryablePatterns = [
      'timeout',
      'etimedout',
      'econnreset',
      'econnrefused',
      'network',
      'temporarily unavailable',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
    ]
    return retryablePatterns.some(pattern => lowerError.includes(pattern))
  }

  private httpApiRequest<T>(endpoint: string): Promise<T> {
    return this.requestQueue.add(
      async () => {
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
      },
      { throwOnTimeout: true },
    )
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

    try {
      Address.parse(address)
      return Promise.resolve(valid)
    } catch {
      return Promise.resolve(invalid)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    try {
      const { pubkey, cursor, pageSize = 25, requestQueue, knownTxIds } = input

      const offset = Number(cursor) || 0

      const fetchTxHistory = async () => {
        const response = await this.httpApiRequest<TonApiTxResponse>(
          `/api/v3/transactions?account=${encodeURIComponent(
            pubkey,
          )}&limit=${pageSize}&offset=${offset}&sort=desc`,
        )
        return response
      }

      const data = requestQueue
        ? await requestQueue.add(fetchTxHistory, { throwOnTimeout: true })
        : await fetchTxHistory()

      if (!data?.transactions || data.transactions.length === 0) {
        return {
          cursor: '',
          pubkey,
          transactions: [],
          txIds: [],
        }
      }

      const addressBook = { ...(data.address_book ?? {}) }

      // Group by trace so a swap is a single transaction carrying all its legs (jetton send +
      // native payout), matching parseTx, rather than disconnected send and receive rows
      const txsByTrace: Record<string, TonTx[]> = {}
      for (const tx of data.transactions) {
        const traceId = tx.trace_id ?? tx.hash
        ;(txsByTrace[traceId] ??= []).push(tx)
      }

      const pageHashes = new Set(data.transactions.map(tx => tx.hash))
      const pageMaxLt = data.transactions.map(tx => BigInt(tx.lt)).reduce((a, b) => (a > b ? a : b))

      // Rows are emitted complete or not at all: a page can slice through a trace, and a trace's
      // initiator (whose account decides whether the trace is ours to merge) may live on another
      // page. Traces needing resolution are fetched whole in batches - ownership, every leg, and
      // an is_incomplete flag in one request each - so a partial group is never emitted for an
      // own trace and never overwrites a complete row.
      const pendingTraceIds = Object.entries(txsByTrace)
        .filter(([traceId]) => {
          if (this.traceNotOwnCache.has(`${pubkey}:${traceId}`)) return false
          if (!pageHashes.has(traceId)) return true
          const initiator = txsByTrace[traceId].find(t => t.hash === traceId)
          return Boolean(initiator && BigInt(initiator.lt) + TRACE_COMPLETION_LT_SPAN > pageMaxLt)
        })
        .map(([traceId]) => traceId)

      for (let i = 0; i < pendingTraceIds.length; i += TRACE_BATCH_SIZE) {
        const batch = pendingTraceIds.slice(i, i + TRACE_BATCH_SIZE)

        try {
          // Every leg of every requested trace in a single request - no lt-window or page-size
          // assumptions, and is_incomplete flags traces still executing
          const result = await this.httpApiRequest<TonTracesResponse>(
            `/api/v3/traces?trace_id=${batch
              .map(encodeURIComponent)
              .join(',')}&limit=${TRACE_BATCH_SIZE}`,
          )
          Object.assign(addressBook, result.address_book ?? {})

          const tracesById = new Map((result.traces ?? []).map(trace => [trace.trace_id, trace]))

          for (const traceId of batch) {
            const trace = tracesById.get(traceId)
            // Not indexed (yet) - emit the page legs as-is
            if (!trace) continue

            const initiator = trace.transactions?.[traceId]
            if (!initiator || !addressesMatch(initiator.account, pubkey)) {
              this.traceNotOwnCache.add(`${pubkey}:${traceId}`)
              continue
            }

            if (trace.is_incomplete) {
              delete txsByTrace[traceId]
              continue
            }

            txsByTrace[traceId] = this.ownTraceTxs(trace, pubkey)
          }
        } catch (error) {
          console.error('[TON] Failed to resolve traces, dropping affected rows this page', {
            batch,
            error,
          })
          for (const traceId of batch) delete txsByTrace[traceId]
        }
      }

      const remainingTxs = Object.values(txsByTrace).flat()

      if (remainingTxs.length === 0) {
        const emptyCursor = data.transactions.length === pageSize ? String(offset + pageSize) : ''
        return { cursor: emptyCursor, pubkey, transactions: [], txIds: [] }
      }

      const lts = remainingTxs.map(tx => BigInt(tx.lt))
      const minLt = lts.reduce((a, b) => (a < b ? a : b)).toString()
      const maxLt = lts.reduce((a, b) => (a > b ? a : b)).toString()

      const bufferedMaxLt = (BigInt(maxLt) + TRACE_LT_SEARCH_RANGE).toString()
      const fetchJettons = () => this.fetchJettonTransfers(pubkey, minLt, bufferedMaxLt)
      const jettonData = requestQueue
        ? await requestQueue.add(fetchJettons, { throwOnTimeout: true })
        : await fetchJettons()

      const jettonAddrBook = { ...addressBook, ...jettonData.address_book }

      const transactions: Transaction[] = []
      const txIds: string[] = []

      for (const [traceId, traceGroup] of Object.entries(txsByTrace)) {
        const owner = traceGroup.find(t => t.hash === traceId) ?? traceGroup[0]

        // Externally-initiated txs are keyed by their message hash - the same id broadcast
        // returns and parseTx uses, so rows upserted at swap time overwrite history rows and
        // vice versa instead of duplicating
        const isExternalInitiated = !owner.in_msg?.source && Boolean(owner.in_msg?.hash)
        const txid = base64ToHex(
          isExternalInitiated && owner.in_msg?.hash ? owner.in_msg.hash : owner.hash,
        )

        const allTransfers = buildTraceTransfers({
          txs: traceGroup,
          jettonTransfers: jettonData.jetton_transfers,
          traceId,
          pubkey,
          addressBook: jettonAddrBook,
          assetId: this.assetId,
          chainId: this.chainId,
        })

        // e.g. a gas-only excess leg of a foreign trace
        if (allTransfers.length === 0) continue

        txIds.push(txid)

        if (knownTxIds?.has(txid)) continue

        const parsedOwner = parseTonTx(
          resolveAddresses(owner, jettonAddrBook),
          pubkey,
          txid,
          this.assetId,
          this.chainId,
        )

        const anyAborted = traceGroup.some(t => t.description?.aborted === true)
        const anyActionFailed = traceGroup.some(t => t.description?.action?.success === false)
        const status = anyAborted || anyActionFailed ? TxStatus.Failed : TxStatus.Confirmed

        transactions.push({
          ...parsedOwner,
          status,
          confirmations: status === TxStatus.Confirmed ? 1 : 0,
          transfers: allTransfers,
        })
      }

      const nextCursor = data.transactions.length === pageSize ? String(offset + pageSize) : ''

      return {
        cursor: nextCursor,
        pubkey,
        transactions,
        txIds,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getTxHistory',
      })
    }
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

  async getJettonWalletAddress(jettonMaster: string, ownerAddress: string): Promise<string> {
    const response = await this.httpApiRequest<{
      jetton_wallets?: { address: string }[]
      address_book?: Record<string, { user_friendly: string }>
    }>(
      `/api/v3/jetton/wallets?owner_address=${encodeURIComponent(
        ownerAddress,
      )}&jetton_address=${encodeURIComponent(jettonMaster)}&limit=1`,
    )

    const wallet = response.jetton_wallets?.[0]
    if (!wallet) {
      throw new Error(`No jetton wallet found for master ${jettonMaster} and owner ${ownerAddress}`)
    }

    const addressBook = response.address_book ?? {}
    return addressBook[wallet.address]?.user_friendly ?? wallet.address
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.TonMainnet>,
  ): Promise<TonSignTx> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const memo = chainSpecific?.memo
      const contractAddress = chainSpecific?.contractAddress

      const jettonWalletAddress = contractAddress
        ? await this.getJettonWalletAddress(contractAddress, from)
        : undefined

      const seqno = await this.getSeqno(from)

      const messageData = {
        type: contractAddress ? 'jetton_transfer' : 'transfer',
        from,
        to,
        value,
        seqno,
        expireAt: Math.floor(Date.now() / 1000) + 60,
        ...(memo ? { memo } : {}),
        ...(jettonWalletAddress ? { contractAddress: jettonWalletAddress } : {}),
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
        txToSign,
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

      return base64ToHex(result.hash ?? '')
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
      const apiHash = isHexHash(msgHash) ? hexToBase64(msgHash) : msgHash

      const result = await this.httpApiRequest<{
        messages?: {
          hash: string
          in_msg_tx_hash?: string
        }[]
      }>(`/api/v3/messages?hash=${encodeURIComponent(apiHash)}`)

      if (!result.messages || result.messages.length === 0) {
        return TxStatus.Pending
      }

      const msg = result.messages[0]
      if (!msg.in_msg_tx_hash) {
        return TxStatus.Pending
      }

      const txResult = await this.httpApiRequest<TonApiTxResponse>(
        `/api/v3/transactions?hash=${encodeURIComponent(msg.in_msg_tx_hash)}&limit=1`,
      )

      const tx = txResult.transactions?.[0]
      if (!tx) {
        return TxStatus.Pending
      }

      const traceId = tx.trace_id ?? msg.in_msg_tx_hash
      const endLt = (BigInt(tx.lt) + TRACE_LT_SEARCH_RANGE).toString()

      const traceTxResult = await this.httpApiRequest<TonApiTxResponse>(
        `/api/v3/transactions?account=${encodeURIComponent(tx.account)}&start_lt=${
          tx.lt
        }&end_lt=${endLt}&sort=asc&limit=20`,
      )

      const traceTxs = (traceTxResult.transactions ?? []).filter(
        t => (t.trace_id ?? t.hash) === traceId,
      )

      const anyAborted = traceTxs.some(t => t.description?.aborted === true)
      const anyActionFailed = traceTxs.some(t => t.description?.action?.success === false)

      if (anyAborted || anyActionFailed) {
        return TxStatus.Failed
      }

      return TxStatus.Confirmed
    } catch {
      return TxStatus.Pending
    }
  }

  private ownTraceTxs(trace: TonTrace, pubkey: string): TonTx[] {
    return Object.values(trace.transactions ?? {})
      .filter(t => addressesMatch(t.account, pubkey))
      .sort((a, b) => (BigInt(a.lt) < BigInt(b.lt) ? -1 : 1))
  }

  private async fetchJettonTransfers(
    pubkey: string,
    startLt: string,
    endLt: string,
  ): Promise<{
    jetton_transfers: JettonTransferRecord[]
    address_book: Record<string, { user_friendly: string }>
  }> {
    try {
      const response = await this.httpApiRequest<{
        jetton_transfers?: JettonTransferRecord[]
        address_book?: Record<string, { user_friendly: string }>
      }>(
        `/api/v3/jetton/transfers?owner_address=${encodeURIComponent(
          pubkey,
        )}&start_lt=${startLt}&end_lt=${endLt}&limit=100&sort=asc`,
      )
      return {
        jetton_transfers: response.jetton_transfers ?? [],
        address_book: response.address_book ?? {},
      }
    } catch (err) {
      console.error(`[TON] Failed to fetch jetton transfers`, err)
      return { jetton_transfers: [], address_book: {} }
    }
  }

  parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    if (typeof txHashOrTx !== 'string') {
      throw new Error(`[TON] parseTx expects a string tx hash, got ${typeof txHashOrTx}`)
    }
    // status poll, history upsert and balance pipeline all parse the same hash within seconds -
    // a short-lived memo collapses them into one network run
    const cacheKey = `${txHashOrTx}:${pubkey}`
    const cached = this.parseTxCache.get(cacheKey)
    if (
      cached &&
      (cached.resolvedAt === undefined || Date.now() - cached.resolvedAt < PARSE_TX_CACHE_TTL_MS)
    ) {
      return cached.promise
    }

    const entry: ParseTxCacheEntry = { promise: this.parseTxImpl(txHashOrTx, pubkey) }
    this.parseTxCache.set(cacheKey, entry)
    entry.promise.then(
      () => {
        entry.resolvedAt = Date.now()
      },
      () => {
        if (this.parseTxCache.get(cacheKey) === entry) this.parseTxCache.delete(cacheKey)
      },
    )

    if (this.parseTxCache.size > 50) {
      for (const [key, e] of this.parseTxCache) {
        if (e.resolvedAt !== undefined && Date.now() - e.resolvedAt >= PARSE_TX_CACHE_TTL_MS) {
          this.parseTxCache.delete(key)
        }
      }
    }

    return entry.promise
  }

  private async parseTxImpl(inputHash: string, pubkey: string): Promise<Transaction> {
    try {
      const apiHash = isHexHash(inputHash) ? hexToBase64(inputHash) : inputHash
      const txid = isHexHash(inputHash) ? inputHash : base64ToHex(inputHash)

      const txResult = await this.httpApiRequest<TonApiTxResponse>(
        `/api/v3/transactionsByMessage?msg_hash=${encodeURIComponent(
          apiHash,
        )}&direction=in&limit=1`,
      )

      const tx = txResult.transactions?.[0]

      if (!tx) {
        // Distinguish a known-but-unprocessed message (pending) from an unknown one
        const msgResult = await this.httpApiRequest<{
          messages?: { hash: string; in_msg_tx_hash?: string }[]
        }>(`/api/v3/messages?hash=${encodeURIComponent(apiHash)}`)

        if (!msgResult.messages || msgResult.messages.length === 0) {
          throw new Error('Message not found')
        }

        return {
          txid,
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

      const traceId = tx.trace_id ?? tx.hash
      const endLt = (BigInt(tx.lt) + TRACE_LT_SEARCH_RANGE).toString()

      const [traceResult, jettonData] = await Promise.all([
        this.httpApiRequest<TonTracesResponse>(
          `/api/v3/traces?tx_hash=${encodeURIComponent(tx.hash)}&limit=1`,
        ),
        this.fetchJettonTransfers(pubkey, tx.lt, endLt),
      ])

      const addressBook = {
        ...(txResult.address_book ?? {}),
        ...(traceResult.address_book ?? {}),
        ...jettonData.address_book,
      }

      const trace = traceResult.traces?.[0]
      const traceTxs = trace ? this.ownTraceTxs(trace, pubkey) : []
      const primaryTx = traceTxs[0] ?? tx

      const txsToProcess = traceTxs.length > 0 ? traceTxs : [tx]

      const allTransfers = buildTraceTransfers({
        txs: txsToProcess,
        jettonTransfers: jettonData.jetton_transfers,
        traceId,
        pubkey,
        addressBook,
        assetId: this.assetId,
        chainId: this.chainId,
      })

      const anyAborted = txsToProcess.some(t => t.description?.aborted === true)
      const anyActionFailed = txsToProcess.some(t => t.description?.action?.success === false)
      const status = anyAborted || anyActionFailed ? TxStatus.Failed : TxStatus.Confirmed
      const isSend = allTransfers.some(transfer => transfer.type === TransferType.Send)

      return {
        txid,
        blockHeight: Number(primaryTx.lt) || 0,
        blockTime: primaryTx.now || 0,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        transfers: allTransfers,
        pubkey,
        ...(isSend &&
          primaryTx.total_fees && { fee: { assetId: this.assetId, value: primaryTx.total_fees } }),
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
