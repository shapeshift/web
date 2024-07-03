import type { AxiosRequestConfig } from 'axios'

import { SwapperName } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/mainnet/api/v1/quote', '/xdai/api/v1/quote']

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const cowServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const cowService = makeSwapperAxiosServiceMonadic(cowServiceBase, SwapperName.CowSwap)
