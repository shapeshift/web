import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { RemoveLiquidityRoutePaths } from './types'

type RemoveLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedWithdrawalQuote
}

export const RemoveLiquidityConfirm = ({ confirmedQuote }: RemoveLiquidityConfirmProps) => {
  const history = useHistory()
  const mixpanel = getMixPanel()

  const handleBack = useCallback(() => {
    history.push(RemoveLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    if (confirmedQuote.positionStatus?.incomplete) {
      mixpanel?.track(MixPanelEvent.LpIncompleteWithdrawConfirm, confirmedQuote)
    } else {
      mixpanel?.track(MixPanelEvent.LpWithdrawConfirm, confirmedQuote)
    }

    history.push(RemoveLiquidityRoutePaths.Status)
  }, [confirmedQuote, history, mixpanel])

  return (
    <ReusableLpConfirm
      baseAssetId={thorchainAssetId}
      confirmedQuote={confirmedQuote}
      handleBack={handleBack}
      handleConfirm={handleConfirm}
    />
  )
}
