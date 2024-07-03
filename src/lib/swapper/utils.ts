import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapperName, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import Axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import { isCrossAccountTradeSupported } from '../../state/helpers'
import { AsyncResultOf } from '../utils'

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

export type MonadicSwapperAxiosService = ReturnType<typeof makeSwapperAxiosServiceMonadic>

export const getEnabledSwappers = (
  { LifiSwap, ThorSwap, ZrxSwap, OneInch, ArbitrumBridge, Portals, Cowswap }: FeatureFlags,
  isCrossAccountTrade: boolean,
): Record<SwapperName, boolean> => {
  return {
    [SwapperName.LIFI]:
      LifiSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.LIFI)),
    [SwapperName.Thorchain]:
      ThorSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Thorchain)),
    [SwapperName.Zrx]:
      ZrxSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Zrx)),
    [SwapperName.OneInch]:
      OneInch && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.OneInch)),
    [SwapperName.CowSwap]:
      Cowswap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.CowSwap)),
    [SwapperName.ArbitrumBridge]:
      ArbitrumBridge &&
      (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.ArbitrumBridge)),
    [SwapperName.Portals]:
      Portals && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Portals)),
    [SwapperName.Test]: false,
  }
}
