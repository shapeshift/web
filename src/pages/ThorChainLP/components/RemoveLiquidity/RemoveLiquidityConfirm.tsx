import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { RemoveLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'

type RemoveLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityConfirm = ({ confirmedQuote }: RemoveLiquidityConfirmProps) => {
  const navigate = useNavigate()
  const mixpanel = getMixPanel()

  const handleBack = useCallback(() => {
    navigate(RemoveLiquidityRoutePaths.Input)
  }, [navigate])

  const handleConfirm = useCallback(() => {
    if (confirmedQuote.positionStatus?.incomplete) {
      mixpanel?.track(MixPanelEvent.LpIncompleteWithdrawConfirm, confirmedQuote)
    } else {
      mixpanel?.track(MixPanelEvent.LpWithdrawConfirm, confirmedQuote)
    }

    navigate(RemoveLiquidityRoutePaths.Status)
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
