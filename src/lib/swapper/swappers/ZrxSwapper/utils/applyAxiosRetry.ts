import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import type { RetryConfig } from 'retry-axios'
import { attach } from 'retry-axios'

type PartialRaxConfig = { raxConfig?: RetryConfig } & AxiosRequestConfig

export function withAxiosRetry(instance: AxiosInstance, options?: Omit<RetryConfig, 'instance'>) {
  instance.interceptors.request.use((config: PartialRaxConfig) => {
    config.raxConfig = config.raxConfig || { instance, ...options }
    return config
  })

  attach(instance)
  return instance
}
