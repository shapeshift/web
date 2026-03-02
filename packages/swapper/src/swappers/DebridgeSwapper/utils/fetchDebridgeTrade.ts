import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight, SwapperConfig } from '../../../types'
import { debridgeService } from './debridgeService'
import type { DebridgeCreateTxResponse } from './types'

export type DebridgeFetchQuoteParams = {
  srcChainId: number
  srcChainTokenIn: string
  srcChainTokenInAmount: string
  dstChainId: number
  dstChainTokenOut: string
  dstChainTokenOutAmount: 'auto'
  dstChainTokenOutRecipient?: string
  srcChainOrderAuthorityAddress?: string
  dstChainOrderAuthorityAddress?: string
  senderAddress?: string
  prependOperatingExpenses: 'true'
  affiliateFeePercent?: string
  affiliateFeeRecipient?: string
}

export const fetchDebridgeTrade = (
  params: DebridgeFetchQuoteParams,
  config: SwapperConfig,
): Promise<Result<AxiosResponse<DebridgeCreateTxResponse>, SwapErrorRight>> => {
  const searchParams = new URLSearchParams()

  searchParams.set('srcChainId', params.srcChainId.toString())
  searchParams.set('srcChainTokenIn', params.srcChainTokenIn)
  searchParams.set('srcChainTokenInAmount', params.srcChainTokenInAmount)
  searchParams.set('dstChainId', params.dstChainId.toString())
  searchParams.set('dstChainTokenOut', params.dstChainTokenOut)
  searchParams.set('dstChainTokenOutAmount', params.dstChainTokenOutAmount)
  searchParams.set('prependOperatingExpenses', params.prependOperatingExpenses)

  if (params.dstChainTokenOutRecipient)
    searchParams.set('dstChainTokenOutRecipient', params.dstChainTokenOutRecipient)
  if (params.srcChainOrderAuthorityAddress)
    searchParams.set('srcChainOrderAuthorityAddress', params.srcChainOrderAuthorityAddress)
  if (params.dstChainOrderAuthorityAddress)
    searchParams.set('dstChainOrderAuthorityAddress', params.dstChainOrderAuthorityAddress)
  if (params.senderAddress) searchParams.set('senderAddress', params.senderAddress)
  if (params.affiliateFeePercent && params.affiliateFeeRecipient) {
    searchParams.set('affiliateFeePercent', params.affiliateFeePercent)
    searchParams.set('affiliateFeeRecipient', params.affiliateFeeRecipient)
  }

  const url = `${config.VITE_DEBRIDGE_API_URL}/dln/order/create-tx?${searchParams.toString()}`

  return debridgeService.get<DebridgeCreateTxResponse>(url)
}
