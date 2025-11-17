import { usePrevious } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useTradeReceiveAddress } from '@/components/MultiHopTrade/components/TradeInput/hooks/useTradeReceiveAddress'
import { useHasFocus } from '@/hooks/useHasFocus'
import { swapperApi } from '@/state/apis/swapper/swapperApi'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const TRADE_QUOTE_REFRESH_INTERVAL_MS = 25_000

export const useGlobalQuotePolling = () => {
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const userSlippageTolerancePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)
  const { manualReceiveAddress, walletReceiveAddress } = useTradeReceiveAddress()
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  const dispatch = useAppDispatch()

  const inputQueryKeys = useMemo(
    () => ({
      buyAsset,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
      receiveAddress,
    }),
    [
      buyAsset,
      receiveAddress,
      sellAmountCryptoPrecision,
      sellAsset,
      userSlippageTolerancePercentageDecimal,
    ],
  )
  const previousInputReactions = usePrevious(inputQueryKeys)

  const hasFocus = useHasFocus()
  const previousHasFocus = usePrevious(hasFocus)

  const query = useQuery({
    queryKey: ['tradeQuoteRefresh', inputQueryKeys],
    queryFn: () => {
      const isNotRefocus = previousHasFocus && hasFocus
      const isNotInputChange = inputQueryKeys === previousInputReactions // Reference compare enabled by useMemo

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
