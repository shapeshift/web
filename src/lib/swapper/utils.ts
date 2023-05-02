import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { AssertionError } from 'assert'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ISetupCache } from 'axios-cache-adapter'
import { setupCache } from 'axios-cache-adapter'
import { AsyncResultOf } from 'lib/utils'

import type { SwapErrorRight } from './api'
import { makeSwapErrorRight, SwapErrorType } from './api'

// asserts x is type doesn't work when using arrow functions
export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new AssertionError({ message: `Expected 'val' to be defined, but received ${val}` })
  }
}

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

export const makeSwapperAxiosServiceMonadic = (service: AxiosInstance) =>
  new Proxy<
    AxiosInstance,
    {
      get: <T = any>(
        url: string,
        config?: AxiosRequestConfig<any>,
      ) => Promise<Result<AxiosResponse<T, any>, SwapErrorRight>>
      post: <T = any>(
        url: string,
        data: any,
        config?: AxiosRequestConfig<any>,
      ) => Promise<Result<AxiosResponse<T, any>, SwapErrorRight>>
    }
  >(service, {
    get: (trappedAxios, method: 'get' | 'post') => {
      const originalMethodPromise = trappedAxios[method]
      return async (...args: [url: string, dataOrConfig?: any, dataOrConfig?: any]) => {
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
