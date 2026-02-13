import { useMemo } from 'react'

import type { ApiClient } from '../api/client'
import { getBaseAsset } from '../constants/chains'
import type { Asset, TradeRate } from '../types'
import { formatAmount, getChainType } from '../types'
import { useChainInfo } from './useAssets'
import { useMultiChainBalance } from './useBalances'
import { formatUsdValue, useMarketData } from './useMarketData'
import { useSwapRates } from './useSwapRates'

type UseSwapDisplayValuesParams = {
  apiClient: ApiClient
  sellAsset: Asset
  buyAsset: Asset
  sellAmountBaseUnit: string | undefined
  isSellAssetEvm: boolean
  isSellAssetUtxo: boolean
  isSellAssetSolana: boolean
  selectedRate: TradeRate | null
  walletAddress: string | undefined
  bitcoinAddress: string | undefined
  solanaAddress: string | undefined
  effectiveReceiveAddress: string
}

export const useSwapDisplayValues = ({
  apiClient,
  sellAsset,
  buyAsset,
  sellAmountBaseUnit,
  isSellAssetEvm,
  isSellAssetUtxo,
  isSellAssetSolana,
  selectedRate,
  walletAddress,
  bitcoinAddress,
  solanaAddress,
  effectiveReceiveAddress,
}: UseSwapDisplayValuesParams) => {
  const buyChainType = getChainType(buyAsset.chainId)

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit: sellAmountBaseUnit,
    enabled:
      !!sellAmountBaseUnit &&
      sellAmountBaseUnit !== '0' &&
      (isSellAssetEvm || isSellAssetUtxo || isSellAssetSolana),
  })

  const {
    data: sellAssetBalance,
    isLoading: isSellBalanceLoading,
    refetch: refetchSellBalance,
  } = useMultiChainBalance(
    walletAddress,
    bitcoinAddress,
    solanaAddress,
    sellAsset.assetId,
    sellAsset.precision,
  )

  const buyAssetAddressForBalance = useMemo(() => {
    if (buyChainType === 'evm') return effectiveReceiveAddress || walletAddress
    if (buyChainType === 'utxo') return effectiveReceiveAddress || bitcoinAddress
    if (buyChainType === 'solana') return effectiveReceiveAddress || solanaAddress
    return effectiveReceiveAddress
  }, [buyChainType, effectiveReceiveAddress, walletAddress, bitcoinAddress, solanaAddress])

  const {
    data: buyAssetBalance,
    isLoading: isBuyBalanceLoading,
    refetch: refetchBuyBalance,
  } = useMultiChainBalance(
    buyChainType === 'evm' ? buyAssetAddressForBalance : walletAddress,
    buyChainType === 'utxo' ? buyAssetAddressForBalance : bitcoinAddress,
    buyChainType === 'solana' ? buyAssetAddressForBalance : solanaAddress,
    buyAsset.assetId,
    buyAsset.precision,
  )

  const { data: sellChainInfo } = useChainInfo(sellAsset.chainId)
  const { data: buyChainInfo } = useChainInfo(buyAsset.chainId)

  const displayRate = useMemo(() => selectedRate ?? rates?.[0], [selectedRate, rates])
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  const sellChainNativeAsset = useMemo(() => getBaseAsset(sellAsset.chainId), [sellAsset.chainId])

  const assetIdsForPrices = useMemo(() => {
    const ids = [sellAsset.assetId, buyAsset.assetId]
    if (sellChainNativeAsset && sellChainNativeAsset.assetId !== sellAsset.assetId) {
      ids.push(sellChainNativeAsset.assetId)
    }
    return ids
  }, [sellAsset.assetId, buyAsset.assetId, sellChainNativeAsset])

  const { data: marketData } = useMarketData(assetIdsForPrices)
  const sellAssetUsdPrice = marketData?.[sellAsset.assetId]?.price
  const buyAssetUsdPrice = marketData?.[buyAsset.assetId]?.price
  const nativeAssetUsdPrice = sellChainNativeAsset
    ? marketData?.[sellChainNativeAsset.assetId]?.price
    : undefined

  const networkFeeDisplay = useMemo(() => {
    const feeBaseUnit = displayRate?.networkFeeCryptoBaseUnit
    if (!feeBaseUnit || feeBaseUnit === '0' || !sellChainNativeAsset) return undefined
    const formatted = formatAmount(feeBaseUnit, sellChainNativeAsset.precision, 6)
    const cryptoPart = `${formatted} ${sellChainNativeAsset.symbol}`
    if (!nativeAssetUsdPrice) return cryptoPart
    const fiatValue = formatUsdValue(
      feeBaseUnit,
      sellChainNativeAsset.precision,
      nativeAssetUsdPrice,
    )
    return `${cryptoPart} (${fiatValue})`
  }, [displayRate?.networkFeeCryptoBaseUnit, sellChainNativeAsset, nativeAssetUsdPrice])

  const sellUsdValue = useMemo(() => {
    if (!sellAmountBaseUnit || !sellAssetUsdPrice) return '$0.00'
    return formatUsdValue(sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice)
  }, [sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice])

  const buyUsdValue = useMemo(() => {
    if (!buyAmount || !buyAssetUsdPrice) return '$0.00'
    return formatUsdValue(buyAmount, buyAsset.precision, buyAssetUsdPrice)
  }, [buyAmount, buyAsset.precision, buyAssetUsdPrice])

  return {
    rates,
    isLoadingRates,
    ratesError,
    sellAssetBalance,
    isSellBalanceLoading,
    refetchSellBalance,
    buyAssetBalance,
    isBuyBalanceLoading,
    refetchBuyBalance,
    sellChainInfo,
    buyChainInfo,
    displayRate,
    buyAmount,
    sellChainNativeAsset,
    networkFeeDisplay,
    sellUsdValue,
    buyUsdValue,
    sellAssetUsdPrice,
    buyAssetUsdPrice,
  }
}
