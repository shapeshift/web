import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { SwapperName } from 'lib/swapper/api'
import { createCache, makeSwapperAxiosServiceMonadic } from 'lib/swapper/utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/mainnet/api/v1/quote', '/xdai/api/v1/quote']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

const cowServiceBase = axios.create(axiosConfig)
export const cowService = makeSwapperAxiosServiceMonadic(cowServiceBase, SwapperName.CowSwap)
