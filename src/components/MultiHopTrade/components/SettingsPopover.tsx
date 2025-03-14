import type { FC } from 'react'
import { memo, useCallback } from 'react'

import { SharedSettingsPopover } from './SharedTradeInput/SharedSettingsPopover'

import { selectUserSlippagePercentage } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectDefaultSlippagePercentage,
  selectQuoteSlippageTolerancePercentage,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type SettingsPopoverProps = {
  isDisabled?: boolean
  tooltipTranslation?: string
}

export const SettingsPopover: FC<SettingsPopoverProps> = memo(
  ({ tooltipTranslation, isDisabled }) => {
    const dispatch = useAppDispatch()
    const defaultSlippagePercentage = useAppSelector(selectDefaultSlippagePercentage)
    const quoteSlippagePercentage = useAppSelector(selectQuoteSlippageTolerancePercentage)
    const userSlippagePercentage = useAppSelector(selectUserSlippagePercentage)

    const setSlippagePreferencePercentage = useCallback(
      (slippagePercentage: string | undefined) => {
        dispatch(tradeInput.actions.setSlippagePreferencePercentage(slippagePercentage))
      },
      [dispatch],
    )

    return (
      <SharedSettingsPopover
        defaultSlippagePercentage={defaultSlippagePercentage}
        isDisabled={isDisabled}
        quoteSlippagePercentage={quoteSlippagePercentage}
        tooltipTranslation={tooltipTranslation}
        userSlippagePercentage={userSlippagePercentage}
        setUserSlippagePercentage={setSlippagePreferencePercentage}
        enableSortBy
      />
    )
  },
)
