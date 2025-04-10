import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useLocation } from 'wouter'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { RemoveLiquidityRoutePaths } from './types'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { LpConfirmedWithdrawalQuote } from '@/lib/utils/thorchain/lp/types'

type RemoveLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityConfirm = ({ confirmedQuote }: RemoveLiquidityConfirmProps) => {
  const [, setLocation] = useLocation()
  const mixpanel = getMixPanel()

  const handleBack = useCallback(() => {
    setLocation(RemoveLiquidityRoutePaths.Input)
  }, [setLocation])

  const handleConfirm = useCallback(() => {
    if (confirmedQuote.positionStatus?.incomplete) {
      mixpanel?.track(MixPanelEvent.LpIncompleteWithdrawPreview, confirmedQuote)
    } else {
      mixpanel?.track(MixPanelEvent.LpWithdrawPreview, confirmedQuote)
    }

    setLocation(RemoveLiquidityRoutePaths.Status)
  }, [confirmedQuote, setLocation, mixpanel])

  return (
    <ReusableLpConfirm
      baseAssetId={thorchainAssetId}
      confirmedQuote={confirmedQuote}
      handleBack={handleBack}
      handleConfirm={handleConfirm}
    />
  )
}
