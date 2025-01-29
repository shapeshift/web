import { SwapperName } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAgeMillis = 15 * 1000
const cachedUrls: string[] = []

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const jupiterServiceBase = createCache(maxAgeMillis, cachedUrls, axiosConfig)

export const jupiterService = makeSwapperAxiosServiceMonadic(
  jupiterServiceBase,
  SwapperName.Jupiter,
)
