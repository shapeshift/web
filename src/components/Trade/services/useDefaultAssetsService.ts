/*
The Default Asset Service is responsible for populating the trade widget with initial assets.
It mutates the buyTradeAsset, sellTradeAsset, amount, and action properties of TradeState.
*/
import { skipToken } from '@reduxjs/toolkit/query'
import {
  AssetId,
  cosmosChainId,
  ethChainId,
  fromAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { supportsCosmos, supportsETH, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { getDefaultAssetIdPairByChainId } from 'components/Trade/hooks/useSwapper/utils'
import { TradeAmountInputField, TradeState } from 'components/Trade/types'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetUsdRateQuery } from 'state/apis/swapper/swapperApi'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useDefaultAssetsService = (routeBuyAssetId?: AssetId) => {
  type UsdRateQueryInput = Parameters<typeof useGetUsdRateQuery>
  type UsdRateInputArg = UsdRateQueryInput[0]

  const {
    state: { wallet },
  } = useWallet()
  const { connectedEvmChainId } = useEvm()
  const { setValue } = useFormContext<TradeState<KnownChainIds>>()
  const [buyAssetFiatRateArgs, setBuyAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)
  const [defaultAssetIdPair, setDefaultAssetIdPair] = useState<[AssetId, AssetId]>()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const assets = useSelector(selectAssets)

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
    const [defaultSellAssetId, defaultBuyAssetId] = getDefaultAssetIdPairByChainId(
      maybeBuyAssetChainId,
      featureFlags,
    )
    setDefaultAssetIdPair([defaultSellAssetId, defaultBuyAssetId])
  }, [featureFlags, maybeWalletChainId, routeBuyAssetId])

  const { data: buyAssetFiatRateData } = useGetUsdRateQuery(buyAssetFiatRateArgs)

  const buyAssetId = useMemo(() => {
    if (routeBuyAssetId && defaultAssetIdPair && routeBuyAssetId !== defaultAssetIdPair[0])
      return routeBuyAssetId

    return defaultAssetIdPair?.[1]
  }, [defaultAssetIdPair, routeBuyAssetId])

  useEffect(
    () =>
      defaultAssetIdPair &&
      buyAssetId &&
      setBuyAssetFiatRateArgs({
        buyAssetId,
        sellAssetId: defaultAssetIdPair[0],
        rateAssetId: buyAssetId,
      }),
    [buyAssetId, defaultAssetIdPair],
  )

  const setInitialAssets = useCallback(() => {
    // TODO: update Swapper to have an proper way to validate a pair is supported.
    if (buyAssetFiatRateData && defaultAssetIdPair && buyAssetId) {
      setValue('buyTradeAsset.asset', assets[buyAssetId])
      setValue('sellTradeAsset.asset', assets[defaultAssetIdPair[0]])
      setValue('action', TradeAmountInputField.SELL_CRYPTO)
      setValue('amount', '0')
    }
  }, [assets, buyAssetFiatRateData, buyAssetId, defaultAssetIdPair, setValue])

  useEffect(() => setInitialAssets(), [setInitialAssets])
}
