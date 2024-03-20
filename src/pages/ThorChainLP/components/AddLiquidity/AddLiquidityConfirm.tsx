import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useHistory } from 'react-router'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'

import { ReusableLpConfirm } from '../ReusableLpConfirm'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityConfirmProps = {
  confirmedQuote: LpConfirmedDepositQuote
}

export const AddLiquidityConfirm = ({ confirmedQuote }: AddLiquidityConfirmProps) => {
  const history = useHistory()
  const mixpanel = getMixPanel()

  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Status)
    mixpanel?.track(MixPanelEvent.LpDepositConfirm, confirmedQuote)
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
