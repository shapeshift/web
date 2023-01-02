import { usePrevious } from '@chakra-ui/react'
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
import {
  getDefaultAssetIdPairByChainId,
  getReceiveAddress,
} from 'components/Trade/hooks/useSwapper/utils'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { type AssetIdTradePair } from 'components/Trade/types'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectWalletAccountIds } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

/*
The Default Asset Hook is responsible for populating the trade widget with initial assets.
It mutates the buyTradeAsset, sellTradeAsset, amount, and action properties of TradeState.
*/
export const useDefaultAssets = (routeBuyAssetId?: AssetId) => {
  const {
    state: { wallet },
  } = useWallet()
  const { connectedEvmChainId } = useEvm()
  const [defaultAssetIdPair, setDefaultAssetIdPair] = useState<AssetIdTradePair>()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const assets = useSelector(selectAssets)
  const dispatch = useAppDispatch()
  const walletAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAccountMetaData = useSelector(selectPortfolioAccountMetadata)

  const { getUsdRates } = swapperApi.endpoints

  // Hooks
  const { tradeQuoteArgs } = useTradeQuoteService()

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
    dispatch,
    getUsdRates,
    tradeQuoteArgs,
    wallet,
    buyAssetId,
    assets,
    walletAccountIds,
    portfolioAccountMetaData,
  ])

  return { getDefaultAssets, defaultAssetIdPair }
}
