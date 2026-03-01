import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { debridgeService } from './debridgeService'
import type { DebridgeSingleChainTransactionResponse } from './types'

export type DebridgeSingleChainFetchParams = {
  chainId: number
  tokenIn: string
  tokenInAmount: string
  tokenOut: string
  tokenOutRecipient?: string
  senderAddress?: string
  slippage?: string
  affiliateFeePercent?: string
  affiliateFeeRecipient?: string
}

export const fetchDebridgeSingleChainTrade = (
  params: DebridgeSingleChainFetchParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<DebridgeSingleChainTransactionResponse>, SwapErrorRight>> => {
  const searchParams = new URLSearchParams()

  searchParams.set('chainId', params.chainId.toString())
  searchParams.set('tokenIn', params.tokenIn)
  searchParams.set('tokenInAmount', params.tokenInAmount)
  searchParams.set('tokenOut', params.tokenOut)
  searchParams.set('slippage', params.slippage ?? 'auto')

  if (params.tokenOutRecipient) searchParams.set('tokenOutRecipient', params.tokenOutRecipient)
  if (params.senderAddress) searchParams.set('senderAddress', params.senderAddress)
  if (params.affiliateFeePercent && params.affiliateFeeRecipient) {
    searchParams.set('affiliateFeePercent', params.affiliateFeePercent)
    searchParams.set('affiliateFeeRecipient', params.affiliateFeeRecipient)
  }

  const url = `${config.VITE_DEBRIDGE_API_URL}/chain/transaction?${searchParams.toString()}`

  return debridgeService.get<DebridgeSingleChainTransactionResponse>(url)
}
