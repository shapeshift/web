import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'
import { SYMBIOSIS_PARTNER_ID } from './constants'

const symbiosisServiceBase = axios.create({
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Partner-Id': SYMBIOSIS_PARTNER_ID,
  },
})

export const symbiosisService = makeSwapperAxiosServiceMonadic(symbiosisServiceBase)
