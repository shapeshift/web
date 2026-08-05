import type { AxiosRequestConfig } from 'axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const axiosConfig: AxiosRequestConfig = { timeout: 10_000 }

export const fyndServiceFactory = ({
  baseUrl,
}: {
  baseUrl: string
}): MonadicSwapperAxiosService => {
  const cache = createCache(5_000, ['/quote', '/info'], {
    ...axiosConfig,
    baseURL: baseUrl,
  })
  return makeSwapperAxiosServiceMonadic(cache)
}
