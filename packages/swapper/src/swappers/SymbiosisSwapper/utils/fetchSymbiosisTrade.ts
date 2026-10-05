import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { symbiosisService } from './symbiosisService'
import type { SymbiosisQuoteRequest, SymbiosisQuoteResponse } from './types'

export const fetchSymbiosisTrade = (
  request: SymbiosisQuoteRequest,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<SymbiosisQuoteResponse>, SwapErrorRight>> =>
  symbiosisService.post<SymbiosisQuoteResponse>(
    `${config.VITE_SYMBIOSIS_API_URL}/v2/quote`,
    request,
  )
