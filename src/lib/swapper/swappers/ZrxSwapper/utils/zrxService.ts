import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import type { MonadicSwapperAxiosService } from 'lib/swapper/utils'
import { createCache, makeSwapperAxiosServiceMonadic } from 'lib/swapper/utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/swap/v1/price']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const zrxServiceFactory = (baseUrl: string): MonadicSwapperAxiosService => {
  const axiosInstance = axios.create({ ...axiosConfig, baseURL: baseUrl })
  return makeSwapperAxiosServiceMonadic(axiosInstance)
}
