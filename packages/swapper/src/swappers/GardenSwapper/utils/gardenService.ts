import type { AxiosRequestConfig } from 'axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'
import { GARDEN_API_KEY_HEADER } from '../constants'

const cachedUrls = ['/quote']
const maxAge = 5 * 1000

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

export const gardenServiceFactory = ({
  apiKey,
}: {
  apiKey: string
}): MonadicSwapperAxiosService => {
  const configWithAuth: AxiosRequestConfig = {
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers,
      [GARDEN_API_KEY_HEADER]: apiKey,
    },
  }

  const cache = createCache(maxAge, cachedUrls, configWithAuth)
  return makeSwapperAxiosServiceMonadic(cache)
}
