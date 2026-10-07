import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

const symbiosisServiceBase = axios.create({
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export const symbiosisService = makeSwapperAxiosServiceMonadic(symbiosisServiceBase)
