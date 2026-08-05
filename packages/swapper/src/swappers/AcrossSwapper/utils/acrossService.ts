import axios from 'axios'

import type { SwapperConfig } from '../../../types'
import { makeSwapperAxiosServiceMonadic } from '../../../utils'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const acrossServiceBase = axios.create(axiosConfig)

export const acrossService = makeSwapperAxiosServiceMonadic(acrossServiceBase)

export const getAcrossRequestConfig = (config: SwapperConfig) =>
  config.VITE_ACROSS_API_KEY
    ? { headers: { Authorization: `Bearer ${config.VITE_ACROSS_API_KEY}` } }
    : undefined
