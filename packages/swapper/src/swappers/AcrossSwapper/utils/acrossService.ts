import axios from 'axios'

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
