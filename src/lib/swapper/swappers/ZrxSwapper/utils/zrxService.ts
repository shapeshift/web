import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import identity from 'lodash/identity'
import type { RetryConfig } from 'retry-axios'
import type { MonadicSwapperAxiosService } from 'lib/swapper/utils'
import { createCache, makeSwapperAxiosServiceMonadic } from 'lib/swapper/utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/swap/v1/price']
const cache = createCache(maxAge, cachedUrls)

// A higher-order function to be applied to the proxied axios instance
type AxiosInstanceHoF = (
  instance: AxiosInstance,
  options?: Omit<RetryConfig, 'instance'>,
) => AxiosInstance

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const zrxServiceFactory = ({
  baseUrl,
  wrapper = identity,
}: {
  baseUrl: string
  wrapper?: AxiosInstanceHoF
}): MonadicSwapperAxiosService => {
  const axiosInstance = wrapper(axios.create({ ...axiosConfig, baseURL: baseUrl }))
  return makeSwapperAxiosServiceMonadic(axiosInstance)
}
