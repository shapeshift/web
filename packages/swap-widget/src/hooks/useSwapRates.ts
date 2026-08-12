import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import type { ApiClient } from '../api/client'
import type { AssetId, TradeRate } from '../types'
import { SwapperName } from '../types'
import { sortRatesByValue } from '../utils/rateDisplay'

const ENABLED_SWAPPER_NAMES = new Set<string>(Object.values(SwapperName))

export type UseSwapRatesParams = {
  sellAssetId: AssetId | undefined
  buyAssetId: AssetId | undefined
  sellAmountCryptoBaseUnit: string | undefined
  buyAmountCryptoBaseUnit?: string | undefined
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
    buyAmountCryptoBaseUnit,
    enabled = true,
    allowedSwapperNames,
    refetchInterval = 15_000,
  } = params

  const isExactOutput = buyAmountCryptoBaseUnit !== undefined
  const amountCryptoBaseUnit = isExactOutput ? buyAmountCryptoBaseUnit : sellAmountCryptoBaseUnit

  return useQuery({
    queryKey: [
      'swapRates',
      sellAssetId,
      buyAssetId,
      amountCryptoBaseUnit,
      isExactOutput,
      allowedSwapperNames,
    ],
    queryFn: async (): Promise<TradeRate[]> => {
      if (!sellAssetId || !buyAssetId || !amountCryptoBaseUnit) {
        return []
      }
      const response = await apiClient.getRates({
        sellAssetId,
        buyAssetId,
        ...(isExactOutput
          ? { buyAmountCryptoBaseUnit: amountCryptoBaseUnit }
          : { sellAmountCryptoBaseUnit: amountCryptoBaseUnit }),
      })

      let filteredRates = response.rates.filter(
        rate =>
          !rate.error &&
          rate.buyAmountCryptoBaseUnit !== '0' &&
          ENABLED_SWAPPER_NAMES.has(rate.swapperName),
      )

      if (allowedSwapperNames?.length) {
        filteredRates = filteredRates.filter(rate => allowedSwapperNames.includes(rate.swapperName))
      }

      return sortRatesByValue(
        filteredRates.map((rate, index) => ({
          ...rate,
          id: rate.id ?? `${rate.swapperName}-${index}`,
        })),
        isExactOutput,
      )
    },
    enabled: enabled && !!sellAssetId && !!buyAssetId && !!amountCryptoBaseUnit,
    staleTime: 10_000,
    refetchInterval,
  })
}
