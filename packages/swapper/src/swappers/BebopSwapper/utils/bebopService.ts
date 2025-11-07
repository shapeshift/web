import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import identity from 'lodash/identity'
import type { RetryConfig } from 'retry-axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000
const cachedUrls = ['/quote', '/price']

// A higher-order function to be applied to the proxied axios instance
type AxiosInstanceHoF = (
  instance: AxiosInstance,
  options?: Omit<RetryConfig, 'instance'>,
) => AxiosInstance

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

export const bebopServiceFactory = ({
  apiKey,
  wrapper = identity,
}: {
  apiKey: string
  wrapper?: AxiosInstanceHoF
}): MonadicSwapperAxiosService => {
  const configWithAuth: AxiosRequestConfig = {
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers,
      'x-api-key': apiKey,
      'source-auth': apiKey,
    },
  }

  const cache = createCache(maxAge, cachedUrls, configWithAuth)
  const axiosInstance = wrapper(cache)
  return makeSwapperAxiosServiceMonadic(axiosInstance)
}
