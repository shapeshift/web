import type { AxiosRequestConfig } from 'axios'

import { SwapperName } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

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
