import { type OrderCreation, SigningScheme } from '@shapeshiftoss/types/dist/cowSwap'

import type { LimitOrderActiveQuote } from './types'

export const buildUnsignedLimitOrder = ({
  params,
  response,
}: LimitOrderActiveQuote): Omit<OrderCreation, 'signature'> => {
  return {
    ...response.quote,
    sellAmount: params.sellAmountCryptoBaseUnit,
    buyAmount: params.buyAmountCryptoBaseUnit,
    signingScheme: SigningScheme.EIP712,
    validTo: params.validTo,
    quoteId: response.id,
    feeAmount: '0',
  }
}
