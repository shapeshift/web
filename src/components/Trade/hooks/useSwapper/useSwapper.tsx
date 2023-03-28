import { type Asset } from '@shapeshiftoss/asset-service'
import { SwapperManager } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { filterAssetsByIds } from 'components/Trade/hooks/useSwapper/utils'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetIds } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectBIP44ParamsByAccountId,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
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
  const assetIds = useSelector(selectAssetIds)

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())
  const wallet = useWallet().state.wallet

  // Callbacks
  const getSupportedSellableAssets = useCallback(
    (assets: Asset[]) => {
      const sellableAssetIds = swapperManager.getSupportedSellableAssetIds({
        assetIds,
      })

      return filterAssetsByIds(assets, sellableAssetIds)
    },
    [assetIds, swapperManager],
  )

  // Selectors
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

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] | undefined => {
      const sellAssetId = sellAsset?.assetId
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = sellAssetId
        ? swapperManager.getSupportedBuyAssetIdsFromSellId({
            assetIds,
            sellAssetId,
          })
        : undefined
      return supportedBuyAssetIds ? filterAssetsByIds(assets, supportedBuyAssetIds) : undefined
    },
    [swapperManager, sellAsset],
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
    ;(async () => {
      flags && setSwapperManager(await getSwapperManager(flags))
    })()
  }, [flags])

  return {
    getSupportedSellableAssets,
    getSupportedBuyAssetsFromSellAsset,
    swapperManager,
    getTrade,
    approve,
  }
}
