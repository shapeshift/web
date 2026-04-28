import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

const axiosConfig = {
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
}

const stargateServiceBase = axios.create(axiosConfig)

export const stargateService = makeSwapperAxiosServiceMonadic(stargateServiceBase)
