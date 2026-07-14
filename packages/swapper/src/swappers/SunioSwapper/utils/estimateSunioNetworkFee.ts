import type { tron } from '@shapeshiftoss/chain-adapters'

import type { SunioRoute } from '../types'
import { buildSunioSwapCalldata } from './buildSwapContractCall'
import { DEFAULT_SLIPPAGE_PERCENTAGE, SUNIO_SMART_ROUTER_CONTRACT } from './constants'

type EstimateSunioNetworkFeeArgs = {
  adapter: tron.ChainAdapter
  route: SunioRoute
  sellAmountCryptoBaseUnit: string
  isSellingNativeTrx: boolean
  address: string
  slippageTolerancePercentageDecimal: string | undefined
}

export const estimateSunioNetworkFeeCryptoBaseUnit = async ({
  adapter,
  route,
  sellAmountCryptoBaseUnit,
  isSellingNativeTrx,
  address,
  slippageTolerancePercentageDecimal,
}: EstimateSunioNetworkFeeArgs): Promise<string> => {
  const data = buildSunioSwapCalldata({
    route,
    sellAmountCryptoBaseUnit,
    minBuyAmountCryptoBaseUnit: '0',
    to: address,
    slippageTolerancePercentageDecimal:
      slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
  })

  const feeData = await adapter.getFeeData({
    to: SUNIO_SMART_ROUTER_CONTRACT,
    value: isSellingNativeTrx ? sellAmountCryptoBaseUnit : '0',
    chainSpecific: {
      from: address,
      data,
    },
  })

  return feeData.fast.txFee
}
