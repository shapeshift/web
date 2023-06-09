import type { AccountId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import type { Asset } from 'lib/asset-service'
import { selectHighestFiatBalanceAccountByAssetId } from 'state/slices/portfolioSlice/selectors'
import {
  selectFirstAccountIdByChainId,
  selectSwapperSupportsCrossAccountTrade,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useAccountIds = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): {
  buyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId
  setBuyAssetAccountId: (accountId: AccountId) => void
  setSellAssetAccountId: (accountId: AccountId) => void
} => {
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)

  const highestFiatBalanceSellAccountId = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: sellAsset.assetId,
    }),
  )
  const highestFiatBalanceBuyAccountId = useAppSelector(state =>
    selectHighestFiatBalanceAccountByAssetId(state, {
      assetId: buyAsset.assetId,
    }),
  )
  const firstSellAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, sellAsset.chainId),
  )
  const firstBuyAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, buyAsset.chainId),
  )

  const [selectedSellAssetAccountId, setSelectedSellAssetAccountId] = useState<
    AccountId | undefined
  >()
  const [selectedBuyAssetAccountId, setSelectedBuyAssetAccountId] = useState<
    AccountId | undefined
  >()

  useEffect(() => {
    setSelectedSellAssetAccountId(highestFiatBalanceSellAccountId ?? firstSellAssetAccountId)
  }, [highestFiatBalanceSellAccountId, firstSellAssetAccountId])

  useEffect(() => {
    setSelectedBuyAssetAccountId(highestFiatBalanceBuyAccountId ?? firstBuyAssetAccountId)
  }, [firstBuyAssetAccountId, highestFiatBalanceBuyAccountId])

  useEffect(() => {
    /*
      This is extremely dangerous. We only want to substitute the buyAssetAccountId with the sellAssetAccountId
      if we have a swapper, and that swapper does not do either of:
        - Trades between assets on the same chain but different accounts
        - Trades between assets on different chains (and possibly different accounts)
    */
    switch (true) {
      case swapperSupportsCrossAccountTrade === false: // force to same account ID
        setSelectedBuyAssetAccountId(selectedSellAssetAccountId)
        return
      case swapperSupportsCrossAccountTrade === true: // no changes required
      case swapperSupportsCrossAccountTrade === undefined: // no swapper
      default:
        return
    }
  }, [selectedSellAssetAccountId, swapperSupportsCrossAccountTrade])

  return {
    sellAssetAccountId: selectedSellAssetAccountId,
    buyAssetAccountId: selectedBuyAssetAccountId,
    setSellAssetAccountId: setSelectedSellAssetAccountId,
    setBuyAssetAccountId: setSelectedBuyAssetAccountId,
  }
}
