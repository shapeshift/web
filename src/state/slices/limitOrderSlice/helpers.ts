import type { Asset, OrderCreation } from '@shapeshiftoss/types'
import { SigningScheme } from '@shapeshiftoss/types'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'

import type { LimitOrderActiveQuote } from './types'

export const buildUnsignedLimitOrder = ({
  params,
  response,
}: LimitOrderActiveQuote): Omit<OrderCreation, 'signature'> => {
  return {
    ...response.quote,
    // IMPORTANT: Replace the amounts with the user inputted values. We don't want to use the quoted
    // amounts here because the quote amounts assume spot trade and will not match the user-inputted
    // limit price.
    sellAmount: params.sellAmountCryptoBaseUnit,
    buyAmount: params.buyAmountCryptoBaseUnit,
    signingScheme: SigningScheme.EIP712,
    validTo: params.validTo,
    quoteId: response.id,
    feeAmount: '0',
  }
}

export const calcLimitPriceBuyAsset = ({
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
}: {
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
  sellAsset: Asset
  buyAsset: Asset
}): string => {
  return bnOrZero(fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision))
    .div(fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision))
    .toFixed()
}
