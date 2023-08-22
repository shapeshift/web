import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { SwapperName } from 'lib/swapper/api'
import { createCache, makeSwapperAxiosServiceMonadic } from 'lib/swapper/utils'

const maxAge = 3 * 1000 // 3 seconds
const cachedUrls = ['/lcd/osmosis/gamm/v1beta1/pools']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

const osmoServiceBase = axios.create(axiosConfig)
export const osmoService = makeSwapperAxiosServiceMonadic(osmoServiceBase, SwapperName.Osmosis)
