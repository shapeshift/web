import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

const axiosConfig = {
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const debridgeServiceBase = axios.create(axiosConfig)

export const debridgeService = makeSwapperAxiosServiceMonadic(debridgeServiceBase)
