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
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import {
  getDefaultAssetIdPairByChainId,
  getReceiveAddress,
} from 'components/Trade/hooks/useSwapper/utils'
import type { TS } from 'components/Trade/types'
import { type AssetIdTradePair, TradeAmountInputField } from 'components/Trade/types'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import {
  selectPortfolioAccountIds,
  selectPortfolioAccountMetadata,
} from 'state/slices/portfolioSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
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
  const { setValue } = useFormContext<TS>()
  const [defaultAssetIdPair, setDefaultAssetIdPair] = useState<AssetIdTradePair>()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const assets = useSelector(selectAssets)
  const dispatch = useAppDispatch()
  const portfolioAccountIds = useSelector(selectPortfolioAccountIds)
  const portfolioAccountMetaData = useSelector(selectPortfolioAccountMetadata)

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

  const buyAssetId = useMemo(() => {
    if (routeBuyAssetId && defaultAssetIdPair && routeBuyAssetId !== defaultAssetIdPair.sellAssetId)
      return routeBuyAssetId

    return defaultAssetIdPair?.buyAssetId
  }, [defaultAssetIdPair, routeBuyAssetId])

  const previousBuyAssetId = usePrevious(buyAssetId)

  const setDefaultAssets = useCallback(async () => {
    if (buyAssetId !== previousBuyAssetId) return

    const maybeBuyAssetChainId = routeBuyAssetId
      ? fromAssetId(routeBuyAssetId).chainId
      : maybeWalletChainId
    const defaultAssetIdPair = getDefaultAssetIdPairByChainId(maybeBuyAssetChainId, featureFlags)

    const { data: buyAssetFiatRateData } = await dispatch(
      getUsdRates.initiate({
        buyAssetId: defaultAssetIdPair.buyAssetId,
        sellAssetId: defaultAssetIdPair.sellAssetId,
        feeAssetId: defaultAssetIdPair.buyAssetId,
      }),
    )

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
      const accountIds = portfolioAccountIds.filter(
        accountId => fromAccountId(accountId).chainId === assetPair.buyAsset.chainId,
      )
      // As long as we have at least one account id for the buy asset, we can do a trade
      const firstAccountId = accountIds[0]
      if (!firstAccountId) return
      const accountMetadata = portfolioAccountMetaData[firstAccountId]
      const receiveAddress = await getReceiveAddress({
        asset: assetPair.buyAsset,
        wallet,
        bip44Params: accountMetadata.bip44Params,
        accountType: accountMetadata.accountType,
      })
      const buyAsset = receiveAddress ? assetPair.buyAsset : assets[foxAssetId]
      const sellAsset = receiveAddress ? assetPair.sellAsset : assets[ethAssetId]
      setValue('action', TradeAmountInputField.SELL_CRYPTO)
      setValue('amount', '0')
      setValue('buyTradeAsset.asset', buyAsset)
      setValue('sellTradeAsset.asset', sellAsset)
    }
  }, [
    assets,
    buyAssetId,
    dispatch,
    featureFlags,
    getUsdRates,
    maybeWalletChainId,
    portfolioAccountIds,
    portfolioAccountMetaData,
    previousBuyAssetId,
    routeBuyAssetId,
    setValue,
    wallet,
  ])

  return { setDefaultAssets }
}
