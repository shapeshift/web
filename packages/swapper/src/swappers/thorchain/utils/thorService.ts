import axios from 'axios'

import { createCache } from '../../../utils'

// Important: maxAge should be small because inbound address info must be recent
const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = [
  '/lcd/thorchain/pools',
  '/lcd/thorchain/inbound_addresses',
  '/lcd/thorchain/pool/',
]
const cache = createCache(maxAge, cachedUrls)

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  adapter: cache.adapter,
}

export const thorService = axios.create(axiosConfig)
