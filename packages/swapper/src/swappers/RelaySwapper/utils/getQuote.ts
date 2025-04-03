import type { Execute } from '@reservoir0x/relay-sdk'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import type { SwapErrorRight, SwapperConfig } from 'packages/swapper/src/types'

import { relayService } from './relayService'
import type { QuoteParams } from './types'

// @TODO: implement affiliate fees
export const getQuote = async <T extends 'quote' | 'rate'>(
  params: QuoteParams<T>,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<Execute, any>, SwapErrorRight>> => {
  return await relayService.post<Execute>(`${config.VITE_RELAY_API_URL}/quote`, params)
}
