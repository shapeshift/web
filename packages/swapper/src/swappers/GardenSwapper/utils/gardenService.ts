import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000
const cachedUrls = ['/quote']

const axiosConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Garden returns HTTP 4xx with a structured body ({status: "Error", error: "..."})
  // for business errors like "Insufficient liquidity" or "expected amount to be within
  // the range...". Accept all status codes so callers can inspect the body and map
  // Garden's error strings to TradeQuoteError codes via errorMessageToTradeQuoteError.
  validateStatus: () => true,
}

const gardenServiceBase = createCache(maxAge, cachedUrls, axiosConfig)

export const gardenService = makeSwapperAxiosServiceMonadic(gardenServiceBase)
