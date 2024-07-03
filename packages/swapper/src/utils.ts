import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getTxStatus } from '@shapeshiftoss/unchained-client/dist/evm'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import Axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { setupCache } from 'axios-cache-interceptor'

import type {
  EvmTransactionExecutionProps,
  EvmTransactionRequest,
  SupportedTradeQuoteStepIndex,
  SwapErrorRight,
  SwapperName,
  TradeQuote,
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

export const makeSwapperAxiosServiceMonadic = (service: AxiosInstance, _swapperName: SwapperName) =>
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
    }
  >(service, {
    get: (trappedAxios, method: 'get' | 'post') => {
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
  quote: TradeQuote | undefined,
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
  txToSign: EvmTransactionRequest,
  callbacks: EvmTransactionExecutionProps,
) => {
  return callbacks.signAndBroadcastTransaction(txToSign)
}

export const createDefaultStatusResponse = (buyTxHash?: string) => ({
  status: TxStatus.Unknown,
  buyTxHash,
  message: undefined,
})

export const checkEvmSwapStatus = async ({
  txHash,
  chainId,
  assertGetEvmChainAdapter,
}: {
  txHash: string
  chainId: ChainId
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
}): Promise<{
  status: TxStatus
  buyTxHash: string | undefined
  message: string | undefined
}> => {
  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const tx = await adapter.httpProvider.getTransaction({ txid: txHash })
    const status = getTxStatus(tx)

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
