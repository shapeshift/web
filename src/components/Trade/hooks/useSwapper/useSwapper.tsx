import type { SwapperManager } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isSome } from 'lib/utils'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectSortedAssetIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import {
  selectBuyAsset,
  selectBuyAssetAccountId,
  selectGetTradeForWallet,
  selectIsExactAllowance,
  selectQuote,
  selectSellAsset,
  selectSellAssetAccountId,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  const activeQuote = useSwapperStore(selectQuote)
  const activeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const sellAssetAccountId = useSwapperStore(selectSellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(selectBuyAssetAccountId)
  const isExactAllowance = useSwapperStore(selectIsExactAllowance)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAsset = useSwapperStore(selectSellAsset)
  const getTradeForWallet = useSwapperStore(selectGetTradeForWallet)

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const sortedAssetIds = useSelector(selectSortedAssetIds)
  const assets = useSelector(selectAssets)

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>()
  const wallet = useWallet().state.wallet

  // Selectors
  const supportedSellAssetsByMarketCap = useMemo(() => {
    if (!swapperManager) return []

    const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
      assetIds: sortedAssetIds,
    })

    return sellableAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, sortedAssetIds, swapperManager])

  const supportedBuyAssetsByMarketCap = useMemo(() => {
    const sellAssetId = sellAsset?.assetId
    if (sellAssetId === undefined || !swapperManager) return []

    const buyableAssetIds = swapperManager.getSupportedBuyAssetIdsFromSellId({
      assetIds: sortedAssetIds,
      sellAssetId,
    })

    return buyableAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, sellAsset?.assetId, sortedAssetIds, swapperManager])

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: sellAsset?.assetId ?? '' }),
  )
  const sellAccountFilter = useMemo(
    () => ({ accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }),
    [sellAssetAccountId, sellAssetAccountIds],
  )

  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  const sellAccountBip44Params = useAppSelector(state =>
    selectBIP44ParamsByAccountId(state, sellAccountFilter),
  )

  const buyAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, { assetId: buyAsset?.assetId ?? '' }),
  )
  const buyAccountFilter = useMemo(
    () => ({ accountId: buyAssetAccountId ?? buyAssetAccountIds[0] }),
    [buyAssetAccountId, buyAssetAccountIds],
  )

  const buyAccountBip44Params = useAppSelector(state =>
    selectBIP44ParamsByAccountId(state, buyAccountFilter),
  )

  const approve = useCallback(async (): Promise<string> => {
    if (!activeSwapper) throw new Error('No swapper available')
    if (!wallet) throw new Error('no wallet available')
    if (!activeQuote) throw new Error('no quote available')
    const txid = isExactAllowance
      ? await activeSwapper.approveAmount({
          amount: activeQuote.sellAmountBeforeFeesCryptoBaseUnit,
          quote: activeQuote,
          wallet,
        })
      : await activeSwapper.approveInfinite({ quote: activeQuote, wallet })
    return txid
  }, [activeSwapper, isExactAllowance, activeQuote, wallet])

  const getTrade = useCallback(async () => {
    if (!wallet) throw new Error('no wallet available')
    if (!sellAccountBip44Params) throw new Error('Missing sellAccountBip44Params')
    if (!buyAccountBip44Params) throw new Error('Missing buyAccountBip44Params')
    if (!sellAccountMetadata) throw new Error('Missing sellAccountMetadata')

    return await getTradeForWallet({
      wallet,
      sellAccountBip44Params,
      sellAccountMetadata,
      buyAccountBip44Params,
    })
  }, [
    wallet,
    getTradeForWallet,
    sellAccountBip44Params,
    sellAccountMetadata,
    buyAccountBip44Params,
  ])

  useEffect(() => {
    if (!flags) return

    getSwapperManager(flags).then(setSwapperManager)
  }, [flags])

  return {
    supportedSellAssetsByMarketCap,
    supportedBuyAssetsByMarketCap,
    getTrade,
    approve,
  }
}
