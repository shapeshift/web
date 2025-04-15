import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { AddLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/types'

type AddLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedDepositQuote
}

export const AddLiquidityConfirm = ({ confirmedQuote }: AddLiquidityConfirmProps) => {
  const navigate = useNavigate()
  const mixpanel = getMixPanel()

  const handleBack = useCallback(() => {
    navigate(AddLiquidityRoutePaths.Input)
  }, [navigate])

  const handleConfirm = useCallback(() => {
    navigate(AddLiquidityRoutePaths.Status)
    mixpanel?.track(MixPanelEvent.LpDepositConfirm, confirmedQuote)
  }, [confirmedQuote, navigate, mixpanel])

  return (
    <ReusableLpConfirm
      baseAssetId={thorchainAssetId}
      confirmedQuote={confirmedQuote}
      handleBack={handleBack}
      handleConfirm={handleConfirm}
    />
  )
}
