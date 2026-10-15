import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import type { ApiClient } from '../api/client'
import type { AssetId, TradeRate } from '../types'
import { SwapperName } from '../types'
import { isPermanentApiError } from '../utils/apiError'
import { isSwappableRate } from '../utils/depositFlow'
import { sortRatesByValue } from '../utils/rateDisplay'

const ENABLED_SWAPPER_NAMES = new Set<string>(Object.values(SwapperName))

export type UseSwapRatesParams = {
  sellAssetId: AssetId | undefined
  sellChainId: string
  buyAssetId: AssetId | undefined
  // Routes the widget can't run are still worth listing when the app can run them
  allowShapeshiftRedirect: boolean
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
    sellChainId,
    buyAssetId,
    allowShapeshiftRedirect,
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
      allowShapeshiftRedirect,
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
          ENABLED_SWAPPER_NAMES.has(rate.swapperName) &&
          (allowShapeshiftRedirect || isSwappableRate(sellChainId, rate)),
      )

      if (allowedSwapperNames?.length) {
        filteredRates = filteredRates.filter(rate => allowedSwapperNames.includes(rate.swapperName))
      }

      return sortRatesByValue(filteredRates, isExactOutput)
    },
    enabled: enabled && !!sellAssetId && !!buyAssetId && !!amountCryptoBaseUnit,
    staleTime: 10_000,
    retry: (failureCount, error) => !isPermanentApiError(error) && failureCount < 3,
    refetchInterval: query => (isPermanentApiError(query.state.error) ? false : refetchInterval),
  })
}
