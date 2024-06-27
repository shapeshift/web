import { createCache, makeSwapperAxiosServiceMonadic, SwapperName } from '@shapeshiftoss/swapper'
import type { AxiosRequestConfig } from 'axios'

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
