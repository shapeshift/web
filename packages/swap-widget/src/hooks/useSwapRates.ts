import { bnOrZero } from '@shapeshiftoss/utils'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import type { ApiClient } from '../api/client'
import type { AssetId, SwapperName, TradeRate } from '../types'

export type UseSwapRatesParams = {
  sellAssetId: AssetId | undefined
  buyAssetId: AssetId | undefined
  sellAmountCryptoBaseUnit: string | undefined
  enabled?: boolean
  allowedSwapperNames?: SwapperName[]
  refetchInterval?: number
}

export const useSwapRates = (
  apiClient: ApiClient,
  params: UseSwapRatesParams,
): UseQueryResult<TradeRate[]> => {
  const {
    sellAssetId,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    enabled = true,
    allowedSwapperNames,
    refetchInterval = 15_000,
  } = params

  return useQuery({
    queryKey: ['swapRates', sellAssetId, buyAssetId, sellAmountCryptoBaseUnit, allowedSwapperNames],
    queryFn: async (): Promise<TradeRate[]> => {
      if (!sellAssetId || !buyAssetId || !sellAmountCryptoBaseUnit) {
        return []
      }
      const response = await apiClient.getRates({
        sellAssetId,
        buyAssetId,
        sellAmountCryptoBaseUnit,
      })

      let filteredRates = response.rates.filter(
        rate => !rate.error && rate.buyAmountCryptoBaseUnit !== '0',
      )

      if (allowedSwapperNames?.length) {
        filteredRates = filteredRates.filter(rate => allowedSwapperNames.includes(rate.swapperName))
      }

      return filteredRates
        .map((rate, index) => ({
          ...rate,
          id: rate.id ?? `${rate.swapperName}-${index}`,
        }))
        .sort((a, b) => {
          const aAmount = bnOrZero(a.buyAmountCryptoBaseUnit)
          const bAmount = bnOrZero(b.buyAmountCryptoBaseUnit)
          return bAmount.minus(aAmount).toNumber()
        })
    },
    enabled: enabled && !!sellAssetId && !!buyAssetId && !!sellAmountCryptoBaseUnit,
    staleTime: 10_000,
    refetchInterval,
  })
}
