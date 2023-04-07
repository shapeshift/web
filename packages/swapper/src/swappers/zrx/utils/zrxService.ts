import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import { createCache } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/swap/v1/price']
const cache = createCache(maxAge, cachedUrls)

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const zrxServiceFactory = (baseUrl: string): AxiosInstance =>
  axios.create({ ...axiosConfig, baseURL: baseUrl })
