import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000
const cachedUrls = ['/quote']

const axiosConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

const gardenServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const gardenService = makeSwapperAxiosServiceMonadic(gardenServiceBase)
