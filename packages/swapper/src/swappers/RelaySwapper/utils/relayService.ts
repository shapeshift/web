import type { AxiosRequestConfig } from 'axios'

import type { SwapperConfig } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAgeMillis = 15 * 1000
const cachedUrls: string[] = []

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const relayServiceBase = createCache(maxAgeMillis, cachedUrls, axiosConfig)

export const relayService = makeSwapperAxiosServiceMonadic(relayServiceBase)

export const getRelayRequestConfig = (config: SwapperConfig): AxiosRequestConfig | undefined =>
  config.VITE_RELAY_API_KEY
    ? { headers: { 'x-api-key': config.VITE_RELAY_API_KEY } }
    : undefined
