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
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import {
  AssetIdTradePair,
  getDefaultAssetIdPairByChainId,
} from 'components/Trade/hooks/useSwapper/utils'
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
  const [defaultAssetIdPair, setDefaultAssetIdPair] = useState<AssetIdTradePair>()

  const featureFlags = useAppSelector(selectFeatureFlags)
  const assets = useSelector(selectAssets)
  const { getReceiveAddressFromBuyAsset } = useSwapper()

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

  const {
    data: buyAssetFiatRateData,
    isUninitialized: isBuyAssetFiatRateUninitialized,
    isLoading: isBuyAssetFiatRateLoading,
  } = useGetUsdRateQuery(buyAssetFiatRateArgs)
  const { data: defaultAssetFiatRateData, isLoading: isDefaultAssetFiatRateLoading } =
    useGetUsdRateQuery(defaultAssetFiatRateArgs)

  const buyAssetId = useMemo(() => {
    if (routeBuyAssetId && defaultAssetIdPair && routeBuyAssetId !== defaultAssetIdPair.sellAssetId)
      return routeBuyAssetId

    return defaultAssetIdPair?.buyAssetId
  }, [defaultAssetIdPair, routeBuyAssetId])

  const previousBuyAssetId = usePrevious(buyAssetId)

  useEffect(
    () =>
      defaultAssetIdPair &&
      buyAssetId &&
      setBuyAssetFiatRateArgs({
        buyAssetId,
        sellAssetId: defaultAssetIdPair.sellAssetId,
        rateAssetId: buyAssetId,
      }),
    [buyAssetId, defaultAssetIdPair],
  )

  useEffect(() => {
    // Do this lazily to reduce network requests - once we know we failed to get a fiat rate for the buy asset
    if (!buyAssetFiatRateData && defaultAssetIdPair && !isBuyAssetFiatRateUninitialized) {
      setDefaultAssetFiatRateArgs({
        buyAssetId: defaultAssetIdPair.buyAssetId,
        sellAssetId: defaultAssetIdPair.sellAssetId,
        rateAssetId: defaultAssetIdPair.buyAssetId,
      })
    }
  }, [buyAssetFiatRateData, defaultAssetIdPair, isBuyAssetFiatRateUninitialized])

  useEffect(() => {
    if (buyAssetId !== previousBuyAssetId) return

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
        case !!(defaultAssetFiatRateData && !isBuyAssetFiatRateLoading && defaultAssetIdPair):
          return {
            buyAsset: assets[defaultAssetIdPair!.buyAssetId],
            sellAsset: assets[defaultAssetIdPair!.sellAssetId],
          }
        // Use FOX/ETH as a fallback, though only if we have a response confirming the defaults aren't supported
        case !(isBuyAssetFiatRateLoading || isDefaultAssetFiatRateLoading):
          return {
            buyAsset: assets['eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'],
            sellAsset: assets[ethAssetId],
          }
        default:
          return undefined
      }
    })()

    if (assetPair) {
      ;(async () => {
        const receiveAddress = await getReceiveAddressFromBuyAsset(assetPair.buyAsset)
        setValue('action', TradeAmountInputField.SELL_CRYPTO)
        setValue('amount', '0')
        setValue(
          'buyTradeAsset.asset',
          receiveAddress
            ? assetPair.buyAsset
            : assets['eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'],
        )
        setValue('sellTradeAsset.asset', receiveAddress ? assetPair.sellAsset : assets[ethAssetId])
      })()
    }
  }, [
    assets,
    buyAssetFiatRateData,
    buyAssetId,
    defaultAssetFiatRateData,
    defaultAssetIdPair,
    getReceiveAddressFromBuyAsset,
    isBuyAssetFiatRateLoading,
    isDefaultAssetFiatRateLoading,
    previousBuyAssetId,
    setValue,
  ])
}
