import type { AxiosRequestConfig } from 'axios'

import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls: string[] = []

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  baseURL: 'https://bs-router-v3.chainservice.io',
}

const butterServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const butterService = makeSwapperAxiosServiceMonadic(butterServiceBase)
