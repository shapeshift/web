import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { RetryConfig } from 'retry-axios'
import { attach } from 'retry-axios'

export function withAxiosRetry(instance: AxiosInstance, options?: Omit<RetryConfig, 'instance'>) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig<any>) => {
    config.raxConfig = config.raxConfig || { instance, ...options }
    return config
  })

  attach(instance)
  return instance
}
