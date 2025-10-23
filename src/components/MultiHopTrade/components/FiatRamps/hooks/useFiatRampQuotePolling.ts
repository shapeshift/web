import { usePrevious } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useHasFocus } from '@/hooks/useHasFocus'
import {
  selectBuyFiatAmount,
  selectBuyFiatCurrency,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectSellCryptoAmount,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { useAppSelector } from '@/state/store'

export const FIAT_RAMP_QUOTE_REFRESH_INTERVAL_MS = 30_000 // 30 seconds

export const useFiatRampQuotePolling = (direction: FiatRampAction) => {
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellCryptoAmount = useAppSelector(selectSellCryptoAmount)
  const buyFiatAmount = useAppSelector(selectBuyFiatAmount)
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)

  const queryClient = useQueryClient()
  const hasFocus = useHasFocus()
  const previousHasFocus = usePrevious(hasFocus)

  const inputQueryKeys = useMemo(
    () => ({
      buyAsset,
      sellAmountCryptoPrecision,
      sellAsset,
      sellCryptoAmount,
      buyCryptoAmount: buyFiatAmount,
      sellFiatCurrency,
      buyFiatCurrency,
      direction,
    }),
    [
      buyAsset,
      sellAmountCryptoPrecision,
      sellAsset,
      sellCryptoAmount,
      buyFiatAmount,
      sellFiatCurrency,
      buyFiatCurrency,
      direction,
    ],
  )
  const previousInputReactions = usePrevious(inputQueryKeys)

  const query = useQuery({
    queryKey: ['fiatRampQuoteRefresh', inputQueryKeys],
    queryFn: () => {
      const isNotRefocus = previousHasFocus && hasFocus
      const isNotInputChange = inputQueryKeys === previousInputReactions

      // Only invalidate if this was triggered by an interval, not refocus or input change
      if (isNotRefocus && isNotInputChange) {
        // Invalidate all ramp quote queries
        queryClient.invalidateQueries({
          queryKey: ['rampQuote'],
        })
      }

      return { lastExecutedTime: Date.now() }
    },
    refetchInterval: FIAT_RAMP_QUOTE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: 'always',
    gcTime: 0,
    enabled: hasFocus,
  })

  return query
}
