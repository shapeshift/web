import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { relayService } from './relayService'
import type { RelayQuote } from './types'

type NotifyTransactionIndexingParams = {
  requestId: string
  chainId: string
  tx: string
}

export const notifyTransactionIndexing = async (
  params: NotifyTransactionIndexingParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<RelayQuote, any>, SwapErrorRight>> => {
  return await relayService.post<RelayQuote>(
    `${config.VITE_RELAY_API_URL}/transactions/single`,
    params,
  )
}
