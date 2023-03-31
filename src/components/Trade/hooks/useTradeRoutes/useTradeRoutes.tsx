import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import type { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { TradeRoutePaths } from 'components/Trade/types'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useTradeRoutes = (): {
  handleAssetClick: (asset: Asset, action: AssetClickAction) => void
} => {
  const history = useHistory()
  const handleAssetSelection = useSwapperStore(state => state.handleAssetSelection)

  const handleAssetClick = useCallback(
    (asset: Asset, action: AssetClickAction) => {
      handleAssetSelection({ asset, action })
      history.push(TradeRoutePaths.Input)
    },
    [handleAssetSelection, history],
  )

  return { handleAssetClick }
}
