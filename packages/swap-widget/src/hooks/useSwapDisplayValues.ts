import type { Asset as ShapeshiftAsset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import type { ApiClient } from '../api/client'
import { getBaseAsset } from '../constants/chains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { TradeRate } from '../types'
import { formatAmount, getChainType } from '../types'
import type { ChainInfo } from './useAssets'
import { useChainInfo } from './useAssets'
import type { BalanceResult } from './useBalances'
import { useMultiChainBalance } from './useBalances'
import { formatUsdValue, useMarketData } from './useMarketData'
import { useSwapRates } from './useSwapRates'

type UseSwapDisplayValuesParams = {
  apiClient: ApiClient
}

type SwapDisplayValues = {
  rates: TradeRate[] | undefined
  isLoadingRates: boolean
  ratesError: Error | null
  sellAssetBalance: BalanceResult | undefined
  isSellBalanceLoading: boolean
  refetchSellBalance: (() => void) | undefined
  buyAssetBalance: BalanceResult | undefined
  isBuyBalanceLoading: boolean
  refetchBuyBalance: (() => void) | undefined
  sellChainInfo: ChainInfo | undefined
  buyChainInfo: ChainInfo | undefined
  displayRate: TradeRate | undefined
  buyAmount: string | undefined
  sellChainNativeAsset: ShapeshiftAsset | undefined
  networkFeeDisplay: string | undefined
  sellUsdValue: string
  buyUsdValue: string
  sellAssetUsdPrice: string | undefined
  buyAssetUsdPrice: string | undefined
  sellBalanceFiatValue: string | undefined
  buyBalanceFiatValue: string | undefined
}

export const useSwapDisplayValues = ({
  apiClient,
}: UseSwapDisplayValuesParams): SwapDisplayValues => {
  const sellAsset = SwapMachineCtx.useSelector(s => s.context.sellAsset)
  const buyAsset = SwapMachineCtx.useSelector(s => s.context.buyAsset)
  const sellAmountBaseUnit = SwapMachineCtx.useSelector(s => s.context.sellAmountBaseUnit)
  const isSellAssetEvm = SwapMachineCtx.useSelector(s => s.context.isSellAssetEvm)
  const isSellAssetUtxo = SwapMachineCtx.useSelector(s => s.context.isSellAssetUtxo)
  const isSellAssetSolana = SwapMachineCtx.useSelector(s => s.context.isSellAssetSolana)
  const selectedRate = SwapMachineCtx.useSelector(s => s.context.selectedRate)

  const { walletAddress, effectiveReceiveAddress, bitcoin, solana } = useSwapWallet()
  const bitcoinAddress = bitcoin.address
  const solanaAddress = solana.address

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

  const sellBalanceFiatValue = useMemo(() => {
    if (!sellAssetBalance?.balance || !sellAssetUsdPrice) return undefined
    return formatUsdValue(sellAssetBalance.balance, sellAsset.precision, sellAssetUsdPrice)
  }, [sellAssetBalance?.balance, sellAsset.precision, sellAssetUsdPrice])

  const buyBalanceFiatValue = useMemo(() => {
    if (!buyAssetBalance?.balance || !buyAssetUsdPrice) return undefined
    return formatUsdValue(buyAssetBalance.balance, buyAsset.precision, buyAssetUsdPrice)
  }, [buyAssetBalance?.balance, buyAsset.precision, buyAssetUsdPrice])

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
    sellBalanceFiatValue,
    buyBalanceFiatValue,
  }
}
