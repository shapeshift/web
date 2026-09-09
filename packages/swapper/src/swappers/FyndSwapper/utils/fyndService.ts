import type { AxiosRequestConfig } from 'axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const axiosConfig: AxiosRequestConfig = { timeout: 10_000 }

type FyndServiceConfig = {
  baseUrl: string
}

export const createFyndService = ({ baseUrl }: FyndServiceConfig): MonadicSwapperAxiosService => {
  const cache = createCache(5_000, ['/quote', '/info'], {
    ...axiosConfig,
    baseURL: baseUrl,
  })
  return makeSwapperAxiosServiceMonadic(cache)
}
