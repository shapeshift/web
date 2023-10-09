import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import type { ISetupCache } from 'axios-cache-adapter'
import { setupCache } from 'axios-cache-adapter'
import { getConfig } from 'config'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import { isCrossAccountTradeSupported } from '../../state/helpers'
import { AsyncResultOf, isTruthy } from '../utils'
import type { SwapErrorRight } from './types'
import { SwapErrorType, SwapperName } from './types'

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: SwapErrorType
}): SwapErrorRight => ({
  name: 'SwapError',
  message,
  details,
  cause,
  code,
})

const getRequestFilter = (cachedUrls: string[]) => (request: Request) =>
  !cachedUrls.some(url => request.url.includes(url))

export const createCache = (maxAge: number, cachedUrls: string[]): ISetupCache => {
  const filter = getRequestFilter(cachedUrls)
  return setupCache({
    maxAge,
    exclude: { filter, query: false },
    clearOnStale: true,
    readOnError: false,
    readHeaders: false,
  })
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
        // getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
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
              code: SwapErrorType.QUERY_FAILED,
            }),
          )
          .andThen<AxiosResponse>(result => {
            if (!result.data)
              return Err(
                makeSwapErrorRight({
                  message: 'makeSwapperAxiosServiceMonadic: no data was returned',
                  cause: result,
                  code: SwapErrorType.QUERY_FAILED,
                }),
              )

            return Ok(result)
          })
      }
    },
  })

export type MonadicSwapperAxiosService = ReturnType<typeof makeSwapperAxiosServiceMonadic>

export const getEnabledSwappers = (
  { LifiSwap, ThorSwap, ZrxSwap, OneInch, Cowswap }: FeatureFlags,
  isCrossAccountTrade: boolean,
) => {
  return [
    LifiSwap && SwapperName.LIFI,
    ThorSwap && SwapperName.Thorchain,
    ZrxSwap && SwapperName.Zrx,
    OneInch && SwapperName.OneInch,
    Cowswap && SwapperName.CowSwap,
  ]
    .filter(isTruthy)
    .filter(swapperName => {
      const swapperSupportsCrossAccountTrade = isCrossAccountTradeSupported(swapperName)
      return !isCrossAccountTrade || swapperSupportsCrossAccountTrade
    })
}

export const createTradeAmountTooSmallErr = (details?: {
  minAmountCryptoBaseUnit: string
  assetId: AssetId
}) =>
  makeSwapErrorRight({
    code: SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL,
    message: 'Sell amount is too small',
    details,
  })

export const isValidSwapAddress = async (address: string): Promise<boolean> => {
  type trmResponse = [
    {
      address: string
      isSanctioned: boolean
    },
  ]

  const response = await axios.post<trmResponse>(
    getConfig().REACT_APP_TRM_LABS_API_URL,
    [
      {
        address,
      },
    ],
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  return !response.data[0].isSanctioned
}
