import axios from 'axios'

import type { MonadicSwapperAxiosService } from '../../../types'
import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const createFyndService = ({ baseUrl }: { baseUrl: string }): MonadicSwapperAxiosService =>
  makeSwapperAxiosServiceMonadic(axios.create({ baseURL: baseUrl, timeout: 10_000 }))
