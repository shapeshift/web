import axios from 'axios'

import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const cleaveService = makeSwapperAxiosServiceMonadic(axios.create({ timeout: 10_000 }))
