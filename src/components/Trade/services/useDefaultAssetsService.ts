/*
The Default Asset Service is responsible for populating the trade widget with initial assets.
It mutates the buyTradeAsset, sellTradeAsset, amount, and action properties of TradeState.
*/
import { usePrevious } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import {
  AssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  fromAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { supportsCosmos, supportsETH, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
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
  const [defaultAssetFiatRateArgs, setDefaultAssetFiatRateArgs] =
    useState<UsdRateInputArg>(skipToken)
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

  const {
    data: buyAssetFiatRateData,
    isUninitialized: isBuyAssetFiatRateUninitialized,
    isLoading: isBuyAssetFiatRateLoading,
  } = useGetUsdRateQuery(buyAssetFiatRateArgs)
  const { data: defaultAssetFiatRateData, isLoading: isDefaultAssetFiatRateLoading } =
    useGetUsdRateQuery(defaultAssetFiatRateArgs)

  const buyAssetId = useMemo(() => {
    if (routeBuyAssetId && defaultAssetIdPair && routeBuyAssetId !== defaultAssetIdPair[0])
      return routeBuyAssetId

    return defaultAssetIdPair?.[1]
  }, [defaultAssetIdPair, routeBuyAssetId])

  const previousBuyAssetId = usePrevious(buyAssetId)

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

  useEffect(() => {
    // Do this lazily to reduce network requests - once we know we failed to get a fiat rate for the buy asset
    if (!buyAssetFiatRateData && defaultAssetIdPair && !isBuyAssetFiatRateUninitialized) {
      setDefaultAssetFiatRateArgs({
        buyAssetId: defaultAssetIdPair?.[1],
        sellAssetId: defaultAssetIdPair?.[0],
        rateAssetId: defaultAssetIdPair?.[1],
      })
    }
  }, [buyAssetFiatRateData, defaultAssetIdPair, isBuyAssetFiatRateUninitialized])

  useEffect(() => {
    if (buyAssetId !== previousBuyAssetId) return
    // TODO: update Swapper to have an proper way to validate a pair is supported.
    if (defaultAssetIdPair) {
      setValue('action', TradeAmountInputField.SELL_CRYPTO)
      setValue('amount', '0')
      // If the swapper supports the buy asset with the default sell asset, use that pair
      if (buyAssetFiatRateData && buyAssetId) {
        setValue('buyTradeAsset.asset', assets[buyAssetId])
        setValue('sellTradeAsset.asset', assets[defaultAssetIdPair[0]])
        // If the swapper supports the default buy asset with the default sell asset, use the default pair
      } else if (defaultAssetFiatRateData && !isBuyAssetFiatRateLoading) {
        setValue('buyTradeAsset.asset', assets[defaultAssetIdPair[1]])
        setValue('sellTradeAsset.asset', assets[defaultAssetIdPair[0]])
        // Use FOX/ETH as a fallback, though only once we have a response confirming the defaults aren't supported
      } else if (!isBuyAssetFiatRateLoading && !isDefaultAssetFiatRateLoading) {
        setValue(
          'buyTradeAsset.asset',
          assets['eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'],
        )
        setValue('sellTradeAsset.asset', assets[ethAssetId])
      }
    }
  }, [
    assets,
    buyAssetFiatRateData,
    buyAssetId,
    defaultAssetFiatRateData,
    defaultAssetIdPair,
    isBuyAssetFiatRateLoading,
    isDefaultAssetFiatRateLoading,
    previousBuyAssetId,
    setValue,
  ])
}
