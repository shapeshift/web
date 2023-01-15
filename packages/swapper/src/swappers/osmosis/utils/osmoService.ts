import axios, { AxiosRequestConfig } from 'axios'

import { createCache } from '../../../utils'

const maxAge = 3 * 1000 // 3 seconds
const cachedUrls = ['/osmosis/gamm/v1beta1/pools']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const osmoService = axios.create(axiosConfig)
