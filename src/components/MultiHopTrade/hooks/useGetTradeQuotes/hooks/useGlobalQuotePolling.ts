import { usePrevious } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useHasFocus } from '@/hooks/useHasFocus'
import { swapperApi } from '@/state/apis/swapper/swapperApi'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const TRADE_QUOTE_REFRESH_INTERVAL_MS = 20_000

export const useGlobalQuotePolling = () => {
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)

  const dispatch = useAppDispatch()

  const inputReactions = useMemo(
    () => ({
      buyAsset,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
    }),
    [buyAsset, sellAmountCryptoPrecision, sellAsset, userSlippageTolerancePercentageDecimal],
  )
  const previousInputReactions = usePrevious(inputReactions)

  const hasFocus = useHasFocus()
  const previousHasFocus = usePrevious(hasFocus)

  const query = useQuery({
    queryKey: ['tradeQuoteRefresh', inputReactions],
    queryFn: () => {
      const isNotRefocus = previousHasFocus && hasFocus
      const isNotInputChange = inputReactions === previousInputReactions // Reference compare enabled by useMemo

      // Only invalidate if this was triggered by an interval, not refocus or input change
      if (isNotRefocus && isNotInputChange) {
        dispatch(swapperApi.util.invalidateTags(['TradeQuote']))
      }

      return { lastExecutedTime: Date.now() }
    },
    refetchInterval: TRADE_QUOTE_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: 'always',
    gcTime: 0,
    enabled: hasFocus,
  })
  return query
}
