import { createCache, makeSwapperAxiosServiceMonadic } from '../utils'

// Important: maxAge should be small because inbound address info must be recent
const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/pools', '/inbound_addresses', '/pool/']

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

export const thorService = makeSwapperAxiosServiceMonadic(
  createCache(maxAge, cachedUrls, axiosConfig),
)
