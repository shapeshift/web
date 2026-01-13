import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId, tonAssetId, tonChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TonWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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

type JettonWalletInfo = {
  address: string
  balance: string
  jetton: string
  jetton_content?: {
    name?: string
    symbol?: string
    decimals?: string
    image?: string
  }
}

type JettonsResponse = {
  jetton_wallets: JettonWalletInfo[]
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
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 1100,
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

          return data.result as T
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
        const baseUrl = this.rpcUrl.replace('/jsonRPC', '')
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
        const jettonsResponse = await this.httpApiRequest<JettonsResponse>(
          `/v2/accounts/${encodeURIComponent(pubkey)}/jettons`,
        )

        if (jettonsResponse.jetton_wallets) {
          tokens = jettonsResponse.jetton_wallets
            .filter(jw => jw.balance && jw.balance !== '0')
            .map(jw => {
              const precision = jw.jetton_content?.decimals
                ? parseInt(jw.jetton_content.decimals, 10)
                : 9

              return {
                assetId: toAssetId({
                  chainId: this.chainId,
                  assetNamespace: 'jetton',
                  assetReference: jw.jetton,
                }),
                balance: jw.balance,
                symbol: jw.jetton_content?.symbol ?? '',
                name: jw.jetton_content?.name ?? '',
                precision,
              }
            })
        }
      } catch {
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

  private async getSeqno(address: string): Promise<number> {
    try {
      const result = await this.rpcRequest<{ stack: [string, string][] }>('runGetMethod', {
        address,
        method: 'seqno',
        stack: [],
      })
      if (result.stack?.[0]?.[1]) {
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

  async getTransactionStatus(txHash: string): Promise<TxStatus> {
    try {
      const result = await this.httpApiRequest<{
        success?: boolean
        in_progress?: boolean
      }>(`/v2/blockchain/transactions/${txHash}`)

      if (result.success) {
        return TxStatus.Confirmed
      }

      if (result.in_progress) {
        return TxStatus.Pending
      }

      return TxStatus.Unknown
    } catch {
      return TxStatus.Unknown
    }
  }

  async parseTx(txHash: string, pubkey: string): Promise<Transaction> {
    try {
      const tx = await this.httpApiRequest<{
        hash: string
        lt: string
        utime: number
        total_fees: string
        success: boolean
        in_msg?: {
          value: string
          source?: { address: string }
          destination?: { address: string }
        }
        out_msgs?: {
          value: string
          destination?: { address: string }
        }[]
      }>(`/v2/blockchain/transactions/${txHash}`)

      const status = tx.success ? TxStatus.Confirmed : TxStatus.Failed

      return {
        txid: txHash,
        blockHeight: parseInt(tx.lt, 10) || 0,
        blockTime: tx.utime || 0,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
        status,
        fee: tx.total_fees
          ? {
              assetId: this.assetId,
              value: tx.total_fees,
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
