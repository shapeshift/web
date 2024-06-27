import { createCache, makeSwapperAxiosServiceMonadic, SwapperName } from '@shapeshiftoss/swapper'
import type { AxiosRequestConfig } from 'axios'

const maxAge = 5 * 1000 // 5 seconds
// Add cached URLs here if some are cachable
const cachedUrls: string[] = []

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}
const oneInchServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const oneInchService = makeSwapperAxiosServiceMonadic(
  oneInchServiceBase,
  SwapperName.OneInch,
)
