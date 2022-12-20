import { ChainId } from '@shapeshiftoss/caip'

import { Trade } from '../../api'

export type CowSwapQuoteResponse = {
  quote: {
    sellToken: string
    buyToken: string
    receiver: string
    sellAmount: string
    buyAmount: string
    validTo: number
    appData: string
    feeAmount: string
    kind: string
    partiallyFillable: boolean
  }
  from: string
  expiration: string
}

export type CowSwapGetOrdersResponse = {
  status: string
}

export type CowSwapGetTradesElement = {
  txHash: string
}

export type CowSwapGetTradesResponse = CowSwapGetTradesElement[]

export interface CowTrade<C extends ChainId> extends Trade<C> {
  feeAmountInSellTokenCryptoBaseUnit: string
  sellAmountDeductFeeCryptoBaseUnit: string
}
