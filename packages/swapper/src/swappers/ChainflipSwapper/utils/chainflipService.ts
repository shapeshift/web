import { SwapperName } from '../../../types'
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 60 * 60 * 1000 // 1 hour cache for assets
const cachedUrls = ['/assets/']

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const chainflipServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const chainflipService = makeSwapperAxiosServiceMonadic(
  chainflipServiceBase,
  SwapperName.Chainflip,
)
