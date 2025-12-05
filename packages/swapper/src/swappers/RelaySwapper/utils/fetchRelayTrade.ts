import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { relayService } from './relayService'
import type { RelayFetchQuoteParams, RelayQuote } from './types'

export const fetchRelayTrade = async <T extends 'quote' | 'rate'>(
  params: RelayFetchQuoteParams<T>,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<RelayQuote, any>, SwapErrorRight>> => {
  return await relayService.post<RelayQuote>(`${config.VITE_RELAY_API_URL}/quote`, params)
}
