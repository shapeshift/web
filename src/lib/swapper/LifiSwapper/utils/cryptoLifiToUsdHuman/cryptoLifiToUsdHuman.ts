import type { Token as LifiToken } from '@lifi/sdk'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero, toHuman } from 'lib/bignumber/bignumber'

export const cryptoLifiToUsdHuman = (
  amountCryptoLifi: BigNumber,
  lifiToken: LifiToken,
): BigNumber => {
  const amountCroptoHuman = toHuman({ value: amountCryptoLifi, inputPrecision: lifiToken.decimals })
  const usdRate = bnOrZero(lifiToken.priceUSD)

  return amountCroptoHuman.times(usdRate)
}
