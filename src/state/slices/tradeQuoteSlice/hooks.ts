import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { tradeQuoteSlice } from './tradeQuoteSlice'
import { QuoteSortOption } from './types'

import { useAppDispatch } from '@/state/store'

export const useQuoteSortOptions = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const quoteSortOptions = useMemo(
    () => [
      {
        label: translate('trade.sort.fastest'),
        value: QuoteSortOption.FASTEST,
        handleClick: (): void => {
          dispatch(tradeQuoteSlice.actions.setSortOption(QuoteSortOption.FASTEST))
        },
      },
      {
        label: translate('trade.sort.bestRate'),
        value: QuoteSortOption.BEST_RATE,
        handleClick: (): void => {
          dispatch(tradeQuoteSlice.actions.setSortOption(QuoteSortOption.BEST_RATE))
        },
      },
      {
        label: translate('trade.sort.lowestGas'),
        value: QuoteSortOption.LOWEST_GAS,
        handleClick: (): void => {
          dispatch(tradeQuoteSlice.actions.setSortOption(QuoteSortOption.LOWEST_GAS))
        },
      },
    ],
    [dispatch, translate],
  )

  return quoteSortOptions
}
