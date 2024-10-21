import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import identity from 'lodash/identity'
import type { RetryConfig } from 'retry-axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { SwapperName } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/swap/v1/price', '/swap/permit2/price']

// A higher-order function to be applied to the proxied axios instance
type AxiosInstanceHoF = (
  instance: AxiosInstance,
  options?: Omit<RetryConfig, 'instance'>,
) => AxiosInstance

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
}

export const zrxServiceFactory = ({
  baseUrl,
  wrapper = identity,
}: {
  baseUrl: string
  wrapper?: AxiosInstanceHoF
}): MonadicSwapperAxiosService => {
  const cache = createCache(maxAge, cachedUrls, { ...axiosConfig, baseURL: baseUrl })
  const axiosInstance = wrapper(cache)
  return makeSwapperAxiosServiceMonadic(axiosInstance, SwapperName.Zrx)
}
