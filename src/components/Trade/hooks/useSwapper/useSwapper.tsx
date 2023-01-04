import { type Asset } from '@shapeshiftoss/asset-service'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import {
  type Swapper,
  type UtxoSupportedChainIds,
  SwapperManager,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useBestSwapper } from 'components/Trade/hooks/useBestSwapper'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import {
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import { filterAssetsByIds } from 'components/Trade/hooks/useSwapper/utils'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import type { TS } from 'components/Trade/types'
import { type BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { selectAssetIds, selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectBIP44ParamsByAccountId,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  // Form hooks
  const { control } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const quote = useWatch({ control, name: 'quote' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const isSendMax = useWatch({ control, name: 'isSendMax' })
  const isExactAllowance = useWatch({ control, name: 'isExactAllowance' })
  const slippage = useWatch({ control, name: 'slippage' })

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const buyAssetId = buyAsset?.assetId
  const sellAssetId = sellAsset?.assetId
  const sellAssetChainId = sellAsset?.chainId

  // Selectors
  const flags = useSelector(selectFeatureFlags)
  const assetIds = useSelector(selectAssetIds)
  const defaultFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, sellAssetChainId ?? ''),
  )

  // Hooks
  const [swapperManager, setSwapperManager] = useState<SwapperManager>(() => new SwapperManager())
  const [bestTradeSwapper, setBestTradeSwapper] = useState<Swapper<KnownChainIds>>()
  const wallet = useWallet().state.wallet
  const { tradeQuoteArgs } = useTradeQuoteService()
  const { receiveAddress } = useReceiveAddress()
  const dispatch = useAppDispatch()
  const { bestSwapper } = useBestSwapper({ feeAsset: defaultFeeAsset })

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

  const swapperSupportsCrossAccountTrade = useMemo(() => {
    if (!bestTradeSwapper) return false
    switch (bestTradeSwapper.name) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
        return true
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
        return false
      default:
        return false
    }
  }, [bestTradeSwapper])

  const getSupportedBuyAssetsFromSellAsset = useCallback(
    (assets: Asset[]): Asset[] | undefined => {
      const sellAssetId = sellTradeAsset?.asset?.assetId
      const assetIds = assets.map(asset => asset.assetId)
      const supportedBuyAssetIds = sellAssetId
        ? swapperManager.getSupportedBuyAssetIdsFromSellId({
            assetIds,
            sellAssetId,
          })
        : undefined
      return supportedBuyAssetIds ? filterAssetsByIds(assets, supportedBuyAssetIds) : undefined
    },
    [swapperManager, sellTradeAsset],
  )

  const checkApprovalNeeded = useCallback(async (): Promise<boolean> => {
    if (!bestTradeSwapper) throw new Error('No swapper available')
    if (!wallet) throw new Error('No wallet available')
    if (!quote) throw new Error('No quote available')
    const { approvalNeeded } = await bestTradeSwapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }, [bestTradeSwapper, quote, wallet])

  const approve = useCallback(async (): Promise<string> => {
    if (!bestTradeSwapper) throw new Error('No swapper available')
    if (!wallet) throw new Error('no wallet available')
    if (!quote) throw new Error('no quote available')
    const txid = isExactAllowance
      ? await bestTradeSwapper.approveAmount({
          amount: quote.sellAmountBeforeFeesCryptoBaseUnit,
          quote,
          wallet,
        })
      : await bestTradeSwapper.approveInfinite({ quote, wallet })
    return txid
  }, [bestTradeSwapper, isExactAllowance, quote, wallet])

  const getTrade = useCallback(async () => {
    if (!sellAsset) throw new Error('No sellAsset')
    if (!bestTradeSwapper) throw new Error('No swapper available')
    if (!sellTradeAsset?.amountCryptoPrecision) throw new Error('Missing sellTradeAsset.amount')
    if (!sellTradeAsset?.asset) throw new Error('Missing sellTradeAsset.asset')
    if (!buyTradeAsset?.asset) throw new Error('Missing buyTradeAsset.asset')
    if (!wallet) throw new Error('Missing wallet')
    if (!receiveAddress) throw new Error('Missing receiveAddress')
    if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')
    if (!sellAccountBip44Params) throw new Error('Missing sellAccountBip44Params')
    if (!sellAccountMetadata) throw new Error('Missing sellAccountMetadata')

    const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
      sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
        sellTradeAsset.amountCryptoPrecision,
        sellAsset.precision,
      ),
      sellAsset: sellTradeAsset?.asset,
      buyAsset: buyTradeAsset?.asset,
      wallet,
      sendMax: isSendMax,
      receiveAddress,
      slippage,
    }
    const sellAssetChainId = sellAsset.chainId
    if (isSupportedNonUtxoSwappingChain(sellAssetChainId)) {
      return bestTradeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        bip44Params: sellAccountBip44Params,
      })
    } else if (isSupportedUtxoSwappingChain(sellAssetChainId)) {
      const { accountType, bip44Params } = sellAccountMetadata
      if (!bip44Params) throw new Error('no bip44Params')
      if (!accountType) throw new Error('no accountType')
      const sellAssetChainAdapter = getChainAdapterManager().get(
        sellAssetChainId,
      ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
      const { xpub } = await sellAssetChainAdapter.getPublicKey(wallet, bip44Params, accountType)
      return bestTradeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        bip44Params,
        accountType,
        xpub,
      })
    }
  }, [
    bestTradeSwapper,
    buyTradeAsset?.asset,
    isSendMax,
    receiveAddress,
    sellAccountBip44Params,
    sellAsset,
    sellAssetAccountId,
    sellAccountMetadata,
    sellTradeAsset?.amountCryptoPrecision,
    sellTradeAsset?.asset,
    slippage,
    wallet,
  ])

  // useEffects
  // Set the bestTradeSwapper when the trade assets change
  useEffect(() => {
    if (buyAssetId && sellAssetId) {
      setBestTradeSwapper(bestSwapper)
    }
  }, [
    bestSwapper,
    buyAssetId,
    defaultFeeAsset,
    dispatch,
    sellAssetId,
    swapperManager,
    tradeQuoteArgs,
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
    checkApprovalNeeded,
    bestTradeSwapper,
    getTrade,
    swapperSupportsCrossAccountTrade,
    approve,
  }
}
