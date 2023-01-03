import { usePrevious } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import {
  type AssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  foxAssetId,
  fromAccountId,
  fromAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { supportsCosmos, supportsETH, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import {
  getDefaultAssetIdPairByChainId,
  getReceiveAddress,
} from 'components/Trade/hooks/useSwapper/utils'
import { type AssetIdTradePair } from 'components/Trade/types'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadata,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectWalletAccountIds } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

/*
The Default Asset Hook is responsible for populating the trade widget with initial assets.
It mutates the buyTradeAsset, sellTradeAsset, amount, and action properties of TradeState.
*/
export const useDefaultAssets = (routeBuyAssetId?: AssetId) => {
  // Hooks
  const wallet = useWallet().state.wallet
  const { connectedEvmChainId } = useEvm()
  const [defaultAssetIdPair, setDefaultAssetIdPair] = useState<AssetIdTradePair>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const assets = useSelector(selectAssets)
  const dispatch = useAppDispatch()
  const walletAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAccountMetaData = useSelector(selectPortfolioAccountMetadata)

  // Constants
  const { getUsdRates } = swapperApi.endpoints

  // If the wallet is connected to a chain, use that ChainId
  // Else, return a prioritized ChainId based on the wallet's supported chains
  const maybeWalletChainId = useMemo(() => {
    if (connectedEvmChainId) return connectedEvmChainId
    if (!wallet) return
    if (supportsETH(wallet)) return ethChainId
    if (supportsCosmos(wallet)) return cosmosChainId
    if (supportsOsmosis(wallet)) return osmosisChainId
  }, [connectedEvmChainId, wallet])

  useEffect(() => {
    // Use the ChainId of the route's AssetId if we have one, else use the wallet's fallback ChainId
    const maybeBuyAssetChainId = routeBuyAssetId
      ? fromAssetId(routeBuyAssetId).chainId
      : maybeWalletChainId
    const defaultAssetIdPair = getDefaultAssetIdPairByChainId(maybeBuyAssetChainId, featureFlags)
    setDefaultAssetIdPair(defaultAssetIdPair)
  }, [featureFlags, maybeWalletChainId, routeBuyAssetId])

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, {
      assetId: defaultAssetIdPair?.sellAssetId ?? '',
    }),
  )

  /*
  We have no form state, so we don't have an accountId.
  Using the first is ok because we are just checking if we can get a quote for the default asset pair.
  This quote is not, and MUST NOT be, used anywhere.
  */
  const sellAccountFilter = { accountId: sellAssetAccountIds[0] }
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  const buyAssetId = useMemo(() => {
    if (routeBuyAssetId && defaultAssetIdPair && routeBuyAssetId !== defaultAssetIdPair.sellAssetId)
      return routeBuyAssetId

    return defaultAssetIdPair?.buyAssetId
  }, [defaultAssetIdPair, routeBuyAssetId])
  const buyChainId = useMemo(
    () => (buyAssetId ? fromAssetId(buyAssetId).chainId : null),
    [buyAssetId],
  )

  const previousBuyAssetId = usePrevious(buyAssetId)
  const previousBuyChainId = useMemo(
    () => (previousBuyAssetId ? fromAssetId(previousBuyAssetId).chainId : null),
    [previousBuyAssetId],
  )

  const getDefaultAssets = useCallback(async () => {
    if (buyChainId !== previousBuyChainId) return

    const maybeBuyAssetChainId = routeBuyAssetId
      ? fromAssetId(routeBuyAssetId).chainId
      : maybeWalletChainId
    const defaultAssetIdPair = getDefaultAssetIdPairByChainId(maybeBuyAssetChainId, featureFlags)

    const buyAsset = buyAssetId ? assets[buyAssetId] : undefined
    const sellAsset: Asset | undefined = assets[defaultAssetIdPair?.sellAssetId]

    const receiveAddress =
      buyAsset && sellAccountMetadata
        ? await getReceiveAddress({
            asset: buyAsset,
            wallet,
            bip44Params: sellAccountMetadata.bip44Params,
            accountType: sellAccountMetadata.accountType,
          })
        : undefined

    // We can't use useTradeQuoteService() here because we don't yet have any form state to compute from
    const tradeQuoteArgs =
      sellAsset && buyAsset && wallet && sellAccountMetadata && receiveAddress
        ? await getTradeQuoteArgs({
            sellAsset,
            buyAsset,
            isSendMax: false,
            sellAmountBeforeFeesCryptoPrecision: '0',
            wallet,
            receiveAddress,
            sellAccountType: sellAccountMetadata.accountType,
            sellAccountBip44Params: sellAccountMetadata.bip44Params,
          })
        : undefined

    const buyAssetFiatRateData =
      tradeQuoteArgs &&
      (
        await dispatch(
          getUsdRates.initiate({
            feeAssetId: defaultAssetIdPair.buyAssetId,
            tradeQuoteArgs,
          }),
        )
      ).data

    // TODO: update Swapper to have an proper way to validate a pair is supported.
    const assetPair = (() => {
      switch (true) {
        // If the swapper supports the buy asset with the default sell asset, use that pair
        case !!(buyAssetFiatRateData && buyAssetId && defaultAssetIdPair):
          return {
            buyAsset: assets[buyAssetId!],
            sellAsset: assets[defaultAssetIdPair!.sellAssetId],
          }
        // If the swapper supports the default buy asset with the default sell asset, use the default pair
        case !!defaultAssetIdPair:
          return {
            buyAsset: assets[defaultAssetIdPair!.buyAssetId],
            sellAsset: assets[defaultAssetIdPair!.sellAssetId],
          }
        // Use FOX/ETH as a fallback, though only if we have a response confirming the defaults aren't supported
        default:
          return {
            buyAsset: assets[foxAssetId],
            sellAsset: assets[ethAssetId],
          }
      }
    })()

    if (assetPair && wallet) {
      const buyAccountIds = walletAccountIds.filter(
        accountId => fromAccountId(accountId).chainId === assetPair.buyAsset.chainId,
      )
      // As long as we have at least one account id for the buy asset, we can do a trade
      const firstBuyAccountId = buyAccountIds[0]
      if (!firstBuyAccountId) return
      const accountMetadata = portfolioAccountMetaData[firstBuyAccountId]
      if (!accountMetadata) return
      if (isUtxoAccountId(firstBuyAccountId) && !accountMetadata.accountType) return

      // guard against erroneous state
      const buyAssetChainId = assetPair.buyAsset.chainId
      const buyAssetAccountChainId = fromAccountId(firstBuyAccountId).chainId
      if (buyAssetChainId !== buyAssetAccountChainId) return

      const receiveAddress = await getReceiveAddress({
        asset: assetPair.buyAsset,
        wallet,
        bip44Params: accountMetadata.bip44Params,
        accountType: accountMetadata.accountType,
      })
      const buyAsset = receiveAddress ? assetPair.buyAsset : assets[foxAssetId]
      const sellAsset = receiveAddress ? assetPair.sellAsset : assets[ethAssetId]
      return { sellAsset, buyAsset }
    }
  }, [
    buyChainId,
    previousBuyChainId,
    routeBuyAssetId,
    maybeWalletChainId,
    featureFlags,
    buyAssetId,
    assets,
    wallet,
    sellAccountMetadata,
    dispatch,
    getUsdRates,
    walletAccountIds,
    portfolioAccountMetaData,
  ])

  return { getDefaultAssets, defaultAssetIdPair }
}
