import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { acrossService } from './acrossService'
import type { AcrossSwapApprovalResponse } from './types'

export type AcrossFetchQuoteParams = {
  tradeType: 'exactInput'
  amount: string
  inputToken: string
  outputToken: string
  originChainId: number
  destinationChainId: number
  depositor: string
  recipient?: string
  appFee?: number
  appFeeRecipient?: string
  integratorId?: string
  slippage?: string
}

export const fetchAcrossTrade = (
  params: AcrossFetchQuoteParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<AcrossSwapApprovalResponse>, SwapErrorRight>> => {
  const searchParams = new URLSearchParams()

  searchParams.set('tradeType', params.tradeType)
  searchParams.set('amount', params.amount)
  searchParams.set('inputToken', params.inputToken)
  searchParams.set('outputToken', params.outputToken)
  searchParams.set('originChainId', params.originChainId.toString())
  searchParams.set('destinationChainId', params.destinationChainId.toString())
  searchParams.set('depositor', params.depositor)

  if (params.recipient) searchParams.set('recipient', params.recipient)
  if (params.appFee !== undefined && params.appFee > 0 && params.appFeeRecipient) {
    searchParams.set('appFee', params.appFee.toString())
    searchParams.set('appFeeRecipient', params.appFeeRecipient)
  }
  if (params.integratorId) searchParams.set('integratorId', params.integratorId)
  if (params.slippage) searchParams.set('slippage', params.slippage)

  const url = `${config.VITE_ACROSS_API_URL}/swap/approval?${searchParams.toString()}`

  return acrossService.get<AcrossSwapApprovalResponse>(url)
}
