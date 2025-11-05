import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import identity from 'lodash/identity'
import type { RetryConfig } from 'retry-axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'
import { BEBOP_QUOTE_CACHE_TTL_MS, BEBOP_QUOTE_TIMEOUT_MS } from './constants'

// Cache configuration
const maxAge = BEBOP_QUOTE_CACHE_TTL_MS // 5 seconds
const cachedUrls = ['/quote', '/price'] // Cache quote and price endpoints

// A higher-order function to be applied to the proxied axios instance
type AxiosInstanceHoF = (
  instance: AxiosInstance,
  options?: Omit<RetryConfig, 'instance'>,
) => AxiosInstance

// Axios configuration for Bebop API
const axiosConfig: AxiosRequestConfig = {
  timeout: BEBOP_QUOTE_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

// Factory function to create Bebop API service
export const bebopServiceFactory = ({
  apiKey,
  wrapper = identity,
}: {
  apiKey: string
  wrapper?: AxiosInstanceHoF
}): MonadicSwapperAxiosService => {
  // Add API key to headers
  const configWithAuth: AxiosRequestConfig = {
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers,
      'x-api-key': apiKey,
      // source-auth header for authentication (from shapeshiftAgenticChat)
      'source-auth': apiKey,
    },
  }

  // Create cached axios instance
  const cache = createCache(maxAge, cachedUrls, configWithAuth)
  const axiosInstance = wrapper(cache)
  return makeSwapperAxiosServiceMonadic(axiosInstance)
}
