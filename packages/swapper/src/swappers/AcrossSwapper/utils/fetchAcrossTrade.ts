import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { acrossService } from './acrossService'
import type { AcrossQuote, AcrossQuoteRequest } from './types'

export const fetchAcrossTrade = (
  request: AcrossQuoteRequest,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<AcrossQuote>, SwapErrorRight>> => {
  return acrossService.post<AcrossQuote>(`${config.VITE_ACROSS_API_URL}/v1/quotes`, request)
}
