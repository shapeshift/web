import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'
import { PANORA_API_URL } from './constants'

export const panoraService = makeSwapperAxiosServiceMonadic(
  axios.create({ baseURL: PANORA_API_URL, timeout: 15_000 }),
)
