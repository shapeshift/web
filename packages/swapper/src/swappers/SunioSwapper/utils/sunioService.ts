import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000

const cachedUrls = ['/swap/router']

export const sunioServiceFactory = () => {
  const axiosConfig = {
    timeout: 10000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }

  const serviceBase = createCache(maxAge, cachedUrls, axiosConfig)
  return makeSwapperAxiosServiceMonadic(serviceBase)
}

export type SunioService = ReturnType<typeof sunioServiceFactory>
