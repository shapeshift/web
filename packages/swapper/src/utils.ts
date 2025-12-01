import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { solanaChainId, suiChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter, SignTx, solana, sui } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx, SuiSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Asset, EvmChainId } from '@shapeshiftoss/types'
import { evm, TxStatus } from '@shapeshiftoss/unchained-client'
import { bn, fromBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import type { TronSignTx } from 'packages/chain-adapters/src/tron/types'

import { fetchSafeTransactionInfo } from './safe-utils'
import type {
  EvmTransactionExecutionProps,
  ExecutableTradeStep,
  SolanaTransactionExecutionProps,
  SuiTransactionExecutionProps,
  SupportedTradeQuoteStepIndex,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
  TradeStatus,
  TronTransactionExecutionProps,
} from './types'
import { TradeQuoteError } from './types'

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: TradeQuoteError
}): SwapErrorRight => ({
  name: 'SwapError',
  message,
  details,
  cause,
  code,
})

export const createTradeAmountTooSmallErr = (details?: {
  minAmountCryptoBaseUnit: string
  assetId: AssetId
}) =>
  makeSwapErrorRight({
    code: TradeQuoteError.SellAmountBelowMinimum,
    message: 'Sell amount is too small',
    details,
  })

const getRequestFilter = (cachedUrls: string[]) => (request: AxiosRequestConfig) =>
  !cachedUrls.some(url => request.url?.includes(url))

export const createCache = (
  maxAge: number,
  cachedUrls: string[],
  axiosConfig: AxiosRequestConfig,
): AxiosInstance => {
  const filter = getRequestFilter(cachedUrls)
  const axiosInstance = Axios.create(axiosConfig)

  setupCache(axiosInstance, {
    ttl: maxAge,
    cachePredicate: cacheResponse => filter(cacheResponse.config),
    interpretHeader: false,
    staleIfError: true,
    cacheTakeover: false,
  })

  return axiosInstance
}

// https://github.com/sniptt-official/monads/issues/111
export const AsyncResultOf = async <T>(promise: Promise<T>): Promise<Result<T, Error>> => {
  try {
    return Ok(await promise)
  } catch (err) {
    return Err(err as Error)
  }
}

// https://github.com/microsoft/TypeScript/issues/20846#issuecomment-353412767
// "new Proxy" is typed as `new <T extends object>(target: T, handler: ProxyHandler<T>): T;`
// i.e same return type as the target object being trapped, but we're akschually returning a monadic flavor of the target object
interface ProxyHandler<T extends object, TOut extends object> {
  get?<K extends keyof TOut>(target: T, p: K, receiver: TOut): TOut[K]
  set?<K extends keyof TOut>(target: T, p: K, value: TOut[K], receiver: TOut): boolean
}
interface ProxyConstructor {
  new <T extends object, TOut extends object>(target: T, handler: ProxyHandler<T, TOut>): TOut
}
declare var Proxy: ProxyConstructor

export const makeSwapperAxiosServiceMonadic = (service: AxiosInstance) =>
  new Proxy<
    AxiosInstance,
    {
      get: <T = any>(
        url: string,
        config?: AxiosRequestConfig<any>,
      ) => Promise<Result<AxiosResponse<T>, SwapErrorRight>>
      post: <T = any>(
        url: string,
        data: any,
        config?: AxiosRequestConfig<any>,
      ) => Promise<Result<AxiosResponse<T>, SwapErrorRight>>
      delete: <T = any>(
        url: string,
        data: any,
        config?: AxiosRequestConfig<any>,
      ) => Promise<Result<AxiosResponse<T>, SwapErrorRight>>
    }
  >(service, {
    get: (trappedAxios, method: 'get' | 'post' | 'delete') => {
      const originalMethodPromise = trappedAxios[method]
      return async (...args: [url: string, dataOrConfig?: any, dataOrConfig?: any]) => {
        // getMixPanel()?.track(MixPanelEvent.SwapperApiRequest, {
        //   swapper: swapperName,
        //   url: args[0],
        //   method,
        // })
        const result = await AsyncResultOf(originalMethodPromise(...args))

        return result
          .mapErr(e =>
            makeSwapErrorRight({
              message: 'makeSwapperAxiosServiceMonadic',
              cause: e,
              code: TradeQuoteError.QueryFailed,
            }),
          )
          .andThen<AxiosResponse>(result => {
            if (!result.data)
              return Err(
                makeSwapErrorRight({
                  message: 'makeSwapperAxiosServiceMonadic: no data was returned',
                  cause: result,
                  code: TradeQuoteError.QueryFailed,
                }),
              )

            return Ok(result)
          })
      }
    },
  })

export const getHopByIndex = (
  quote: TradeQuote | TradeRate | undefined,
  index: SupportedTradeQuoteStepIndex,
) => {
  if (quote === undefined) return undefined
  if (index > 1) {
    throw new Error("Index out of bounds - Swapper doesn't currently support more than 2 hops.")
  }
  const hop = quote.steps[index]

  return hop
}

export const executeEvmTransaction = (
  txToSign: SignTx<EvmChainId>,
  callbacks: EvmTransactionExecutionProps,
) => {
  return callbacks.signAndBroadcastTransaction(txToSign)
}

export const executeSolanaTransaction = (
  txToSign: SolanaSignTx,
  callbacks: SolanaTransactionExecutionProps,
) => {
  return callbacks.signAndBroadcastTransaction(txToSign)
}

export const executeTronTransaction = (
  txToSign: TronSignTx,
  callbacks: TronTransactionExecutionProps,
) => {
  return callbacks.signAndBroadcastTransaction(txToSign)
}

export const executeSuiTransaction = (
  txToSign: SuiSignTx,
  callbacks: SuiTransactionExecutionProps,
) => {
  return callbacks.signAndBroadcastTransaction(txToSign)
}

export const createDefaultStatusResponse = (buyTxHash?: string) => ({
  status: TxStatus.Unknown,
  buyTxHash,
  message: undefined,
})

export const checkSafeTransactionStatus = async ({
  address,
  txHash,
  chainId,
  assertGetEvmChainAdapter,
  fetchIsSmartContractAddressQuery,
}: {
  address: string | undefined
  txHash: string
  chainId: ChainId
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
  fetchIsSmartContractAddressQuery: (userAddress: string, chainId: ChainId) => Promise<boolean>
}): Promise<TradeStatus | undefined> => {
  const { isExecutedSafeTx, isQueuedSafeTx, transaction } = await fetchSafeTransactionInfo({
    address,
    chainId,
    fetchIsSmartContractAddressQuery,
    safeTxHash: txHash,
  })

  if (!transaction) return

  // SAFE proposal queued, but not executed on-chain yet
  if (isQueuedSafeTx) {
    return {
      status: TxStatus.Pending,
      message: [
        'common.safeProposalQueued',
        {
          currentConfirmations: transaction.confirmations?.length,
          confirmationsRequired: transaction.confirmationsRequired,
        },
      ],
      buyTxHash: undefined,
    }
  }

  // Transaction executed on-chain
  if (isExecutedSafeTx) {
    const adapter = assertGetEvmChainAdapter(chainId)
    const tx = await adapter.httpProvider.getTransaction({ txid: transaction.transactionHash })
    const status = evm.getTxStatus(tx)

    return {
      status,
      buyTxHash: transaction.transactionHash,
      message: 'common.safeProposalExecuted',
    }
  }
}

export const checkEvmSwapStatus = async ({
  txHash,
  chainId,
  address,
  assertGetEvmChainAdapter,
  fetchIsSmartContractAddressQuery,
}: {
  txHash: string
  address: string | undefined
  chainId: ChainId
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
  fetchIsSmartContractAddressQuery: (userAddress: string, chainId: ChainId) => Promise<boolean>
}): Promise<TradeStatus> => {
  try {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      address,
      txHash,
      fetchIsSmartContractAddressQuery,
      chainId,
      assertGetEvmChainAdapter,
    })
    if (maybeSafeTransactionStatus) return maybeSafeTransactionStatus

    const adapter = assertGetEvmChainAdapter(chainId)
    const tx = await adapter.httpProvider.getTransaction({ txid: txHash })
    const status = evm.getTxStatus(tx)

    return {
      status,
      buyTxHash: txHash,
      message: undefined,
    }
  } catch (e) {
    console.error(e)
    return createDefaultStatusResponse(txHash)
  }
}

export const getInputOutputRate = ({
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
}: {
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  const sellAmountCryptoHuman = fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision)
  const buyAmountCryptoHuman = fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision)
  return bn(buyAmountCryptoHuman).div(sellAmountCryptoHuman).toFixed()
}

export const isExecutableTradeQuote = (quote: TradeQuote | TradeRate): quote is TradeQuote =>
  quote.quoteOrRate === 'quote'

export const isExecutableTradeStep = (step: TradeQuoteStep): step is ExecutableTradeStep =>
  step.accountNumber !== undefined

export const getExecutableTradeStep = (
  tradeQuote: TradeQuote,
  stepIndex: SupportedTradeQuoteStepIndex,
) => {
  const step = getHopByIndex(tradeQuote, stepIndex)
  if (!step) throw new Error(`No hop found for stepIndex ${stepIndex}`)

  if (!isExecutableTradeStep(step)) throw Error('Unable to execute a trade rate step')

  return step
}

export const checkSolanaSwapStatus = async ({
  txHash,
  address,
  assertGetSolanaChainAdapter,
}: {
  txHash: string
  address: string | undefined
  assertGetSolanaChainAdapter: (chainId: ChainId) => solana.ChainAdapter
}): Promise<TradeStatus> => {
  try {
    if (!address) throw new Error('Missing address')

    const adapter = assertGetSolanaChainAdapter(solanaChainId)
    const tx = await adapter.httpProvider.getTransaction({ txid: txHash })
    const status = await adapter.getTxStatus(tx, address)

    return {
      status,
      buyTxHash: txHash,
      message: undefined,
    }
  } catch (e) {
    console.error(e)
    return createDefaultStatusResponse(txHash)
  }
}

export const checkSuiSwapStatus = async ({
  txHash,
  address,
  assertGetSuiChainAdapter,
}: {
  txHash: string
  address: string | undefined
  assertGetSuiChainAdapter: (chainId: ChainId) => sui.ChainAdapter
}): Promise<TradeStatus> => {
  try {
    if (!address) throw new Error('Missing address')

    const adapter = assertGetSuiChainAdapter(suiChainId)
    const client = adapter.getSuiClient()

    const txResponse = await client.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
      },
    })

    const status =
      txResponse.effects?.status?.status === 'success' ? TxStatus.Confirmed : TxStatus.Failed

    return {
      status,
      buyTxHash: txHash,
      message: undefined,
    }
  } catch (e) {
    console.error(e)
    return createDefaultStatusResponse(txHash)
  }
}
