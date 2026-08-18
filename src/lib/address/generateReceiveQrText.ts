import type { Asset } from '@shapeshiftoss/types'
import { buildPaymentUri } from '@shapeshiftoss/utils'

import { EMPTY_ADDRESS_ERROR } from './constants'

export type GenerateReceiveQrTextArgs = {
  receiveAddress: string
  asset: Asset
  amountCryptoPrecision?: string
}

export const generateReceiveQrText = ({
  receiveAddress,
  asset,
  amountCryptoPrecision,
}: GenerateReceiveQrTextArgs): string => {
  if (!receiveAddress) {
    throw new Error(EMPTY_ADDRESS_ERROR)
  }

  return buildPaymentUri({ address: receiveAddress, asset, amountCryptoPrecision })
}
