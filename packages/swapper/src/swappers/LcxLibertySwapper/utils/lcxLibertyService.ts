import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const lcxLibertyService = makeSwapperAxiosServiceMonadic(axios.create({ timeout: 10_000 }))
