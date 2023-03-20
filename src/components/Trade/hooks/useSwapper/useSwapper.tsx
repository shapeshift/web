import { type Asset } from '@shapeshiftoss/asset-service'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { SwapperManager, SwapperName } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import {
  isSupportedCosmosSdkSwappingChain,
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/typeGuards'
import { filterAssetsByIds } from 'components/Trade/hooks/useSwapper/utils'
import { type BuildTradeInputCommonArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { selectAssetIds } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectBIP44ParamsByAccountId,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectQuote, selectSlippage } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Swapper hook is responsible for providing computed swapper state to consumers.
It does not mutate state.
*/
export const useSwapper = () => {
  const activeQuote = useSwapperStore(selectQuote)
  const activeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const sellAssetAccountId = useSwapperStore(state => state.sellAssetAccountId)
  const buyAssetAccountId = useSwapperStore(state => state.buyAssetAccountId)
  const isSendMax = useSwapperStore(state => state.isSendMax)
  const isExactAllowance = useSwapperStore(state => state.isExactAllowance)
  const slippage = useSwapperStore(selectSlippage)
  const receiveAddress = useSwapperStore(state => state.receiveAddress)
  const buyAsset = useSwapperStore(state => state.buyAsset)
  const sellAsset = useSwapperStore(state => state.sellAsset)
  const sellAmountCryptoPrecision = useSwapperStore(state => state.sellAmountCryptoPrecision)

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

  /*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
  const swapperSupportsCrossAccountTrade = useMemo(() => {
    if (!activeSwapper) return undefined
    switch (activeSwapper.name) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
      case SwapperName.LIFI:
        return true
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
        return false
      default:
        return false
    }
  }, [activeSwapper])

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

  const checkApprovalNeeded = useCallback(async (): Promise<boolean> => {
    if (!activeSwapper) throw new Error('No swapper available')
    if (!wallet) throw new Error('No wallet available')
    if (!activeQuote) throw new Error('No quote available')
    const { approvalNeeded } = await activeSwapper.approvalNeeded({ quote: activeQuote, wallet })
    return approvalNeeded
  }, [activeSwapper, activeQuote, wallet])

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
    if (!sellAsset) throw new Error('No sellAsset')
    if (!activeSwapper) throw new Error('No swapper available')
    if (!sellAmountCryptoPrecision) throw new Error('Missing sellTradeAsset.amount')
    if (!sellAsset) throw new Error('Missing sellAsset')
    if (!buyAsset) throw new Error('Missing buyAsset')
    if (!wallet) throw new Error('Missing wallet')
    if (!receiveAddress) throw new Error('Missing receiveAddress')
    if (!sellAssetAccountId) throw new Error('Missing sellAssetAccountId')
    if (!sellAccountBip44Params) throw new Error('Missing sellAccountBip44Params')
    if (!buyAccountBip44Params) throw new Error('Missing buyAccountBip44Params')
    if (!sellAccountMetadata) throw new Error('Missing sellAccountMetadata')

    const buildTradeCommonArgs: BuildTradeInputCommonArgs = {
      sellAmountBeforeFeesCryptoBaseUnit: toBaseUnit(
        sellAmountCryptoPrecision,
        sellAsset.precision,
      ),
      sellAsset,
      buyAsset,
      wallet,
      sendMax: isSendMax,
      receiveAddress,
      slippage,
    }
    const sellAssetChainId = sellAsset.chainId
    if (isSupportedCosmosSdkSwappingChain(sellAssetChainId)) {
      const { accountNumber } = sellAccountBip44Params
      const { accountNumber: receiveAccountNumber } = buyAccountBip44Params
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
        receiveAccountNumber,
      })
    } else if (isSupportedNonUtxoSwappingChain(sellAssetChainId)) {
      const { accountNumber } = sellAccountBip44Params
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
      })
    } else if (isSupportedUtxoSwappingChain(sellAssetChainId)) {
      const { accountType, bip44Params } = sellAccountMetadata
      const { accountNumber } = bip44Params
      if (!bip44Params) throw new Error('no bip44Params')
      if (!accountType) throw new Error('no accountType')
      const sellAssetChainAdapter = getChainAdapterManager().get(
        sellAssetChainId,
      ) as unknown as UtxoBaseAdapter<UtxoChainId>
      const { xpub } = await sellAssetChainAdapter.getPublicKey(wallet, accountNumber, accountType)
      return activeSwapper.buildTrade({
        ...buildTradeCommonArgs,
        chainId: sellAssetChainId,
        accountNumber,
        accountType,
        xpub,
      })
    }
  }, [
    sellAsset,
    activeSwapper,
    sellAmountCryptoPrecision,
    buyAsset,
    wallet,
    receiveAddress,
    sellAssetAccountId,
    sellAccountBip44Params,
    buyAccountBip44Params,
    sellAccountMetadata,
    isSendMax,
    slippage,
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
    getTrade,
    swapperSupportsCrossAccountTrade,
    approve,
  }
}
