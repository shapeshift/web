import type { FC } from 'react'
import { memo } from 'react'

import { TradeQuoteAdvanced } from './TradeQuoteAdvanced'
import { TradeQuoteBasic } from './TradeQuoteBasic'

import type { ApiQuote } from '@/state/apis/swapper/types'
import { preferences, QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

export type TradeQuoteProps = {
  isActive: boolean
  isBest?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  quoteData: ApiQuote
  isLoading: boolean
  onBack?: () => void
}

export const TradeQuote: FC<TradeQuoteProps> = memo(props => {
  const quoteDisplayOption = useAppSelector(preferences.selectors.selectQuoteDisplayOption)
  return quoteDisplayOption === QuoteDisplayOption.Advanced ? (
    <TradeQuoteAdvanced {...props} />
  ) : (
    <TradeQuoteBasic {...props} />
  )
})
