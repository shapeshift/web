import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type KyberTradeQuoteInput = GetEvmTradeQuoteInput
export type KyberTradeRateInput = GetEvmTradeRateInput

export type KyberExtraFee = {
  feeAmount: string
  chargeFeeBy: '' | 'currency_in' | 'currency_out'
  isInBps: boolean
  feeReceiver: string
}

export type KyberFeeParams = {
  feeAmount: string
  chargeFeeBy: 'currency_out'
  isInBps: true
  feeReceiver: Address
}

export type KyberRouteHop = {
  pool: string
  tokenIn: string
  tokenOut: string
  swapAmount: string
  amountOut: string
  exchange: string
  poolType: string
}

export type KyberRouteSummary = {
  tokenIn: string
  amountIn: string
  amountInUsd: string
  tokenOut: string
  amountOut: string
  amountOutUsd: string
  gas: string
  gasPrice: string
  gasUsd: string
  l1FeeUsd: string
  extraFee: KyberExtraFee
  route: KyberRouteHop[][]
  routerAddress: Address
  routeID: string
  checksum: string
  timestamp: number
}

export type KyberRouteData = {
  routeSummary: KyberRouteSummary
  routerAddress: Address
}

export type KyberRoutesResponse = {
  code: number
  message: string
  data?: KyberRouteData
  requestId: string
}

export type KyberBuildData = {
  amountIn: string
  amountOut: string
  gas: string
  data: Hex
  routerAddress: Address
  transactionValue: string
}

export type KyberBuildResponse = {
  code: number
  message: string
  data?: KyberBuildData
  requestId: string
}

export type KyberErrorResponse = {
  code: number
  message: string
  requestId?: string
}
