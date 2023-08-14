import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import identity from 'lodash/identity'
import type { RetryConfig } from 'retry-axios'
import { apiKey, baseUrl } from 'lib/investor/investor-idle/constants'
import { createCache } from 'lib/swapper/utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['pools']
const cache = createCache(maxAge, cachedUrls)

// A higher-order function to be applied to the proxied axios instance
type AxiosInstanceHoF = (
  instance: AxiosInstance,
  options?: Omit<RetryConfig, 'instance'>,
) => AxiosInstance

const axiosConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: { Authorization: `Bearer ${apiKey}` },
  adapter: cache.adapter,
}

export const idleServiceFactory = ({
  wrapper = identity,
}: {
  wrapper?: AxiosInstanceHoF
} = {}): AxiosInstance => {
  return wrapper(axios.create({ ...axiosConfig, baseURL: baseUrl }))
}
