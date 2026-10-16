import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const fyndService = makeSwapperAxiosServiceMonadic(axios.create({ timeout: 10_000 }))
