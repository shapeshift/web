import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const kyberService = makeSwapperAxiosServiceMonadic(axios.create({ timeout: 10_000 }))
