import axios, { AxiosRequestConfig } from 'axios'

import { createCache } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/mainnet/api/v1/quote']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const cowService = axios.create(axiosConfig)
