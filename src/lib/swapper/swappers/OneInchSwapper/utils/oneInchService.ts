import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { SwapperName } from 'lib/swapper/api'
import { createCache, makeSwapperAxiosServiceMonadic } from 'lib/swapper/utils'

const maxAge = 5 * 1000 // 5 seconds
// Add cached URLs here if some are cachable
const cachedUrls: string[] = []
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

const oneInchServiceBase = axios.create(axiosConfig)
export const oneInchService = makeSwapperAxiosServiceMonadic(
  oneInchServiceBase,
  SwapperName.OneInch,
)
