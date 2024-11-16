import { CoWSwapSigningScheme } from '@shapeshiftoss/swapper'
import type { LimitOrder } from 'state/apis/limit-orders/types'

import type { LimitOrderActiveQuote } from './types'

export const buildUnsignedLimitOrder = ({
  params,
  response,
}: LimitOrderActiveQuote): Omit<LimitOrder, 'signature'> => {
  return {
    ...response.quote,
    sellAmount: params.sellAmountCryptoBaseUnit,
    buyAmount: params.buyAmountCryptoBaseUnit,
    signingScheme: CoWSwapSigningScheme.EIP712,
    validTo: params.validTo,
    quoteId: response.id,
    feeAmount: '0',
  }
}
