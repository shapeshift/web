import type { Asset as ShapeshiftAsset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { useMemo } from 'react'

import type { ApiClient } from '../api/client'
import { getBaseAsset } from '../constants/chains'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { SwapperName, TradeRate } from '../types'
import { formatAmount, getChainType } from '../types'
import type { ChainInfo } from './useAssets'
import { useChainInfo } from './useAssets'
import type { BalanceResult } from './useBalances'
import { useMultiChainBalance } from './useBalances'
import { formatUsdValue, useMarketData } from './useMarketData'
import { useSwapRates } from './useSwapRates'

type UseSwapDisplayValuesParams = {
  apiClient: ApiClient
  allowedSwapperNames?: SwapperName[]
  ratesRefetchInterval?: number
}

export type SwapDisplayValues = {
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
  isExactOutput: boolean
  sellAmountBaseUnit: string | undefined
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
  allowedSwapperNames,
  ratesRefetchInterval,
}: UseSwapDisplayValuesParams): SwapDisplayValues => {
  const context = SwapMachineCtx.useSelector(s => s.context)
  const {
    sellAsset,
    buyAsset,
    buyAmountBaseUnit,
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    selectedRate,
  } = context

  const { receiveAddress, isReceiveAddressBlocked, evm, bitcoin, solana } = useSwapWallet()
  const evmAddress = evm.address
  const bitcoinAddress = bitcoin.address
  const solanaAddress = solana.address

  const buyChainType = getChainType(buyAsset.chainId)

  const isExactOutput = !!buyAmountBaseUnit
  const amountBaseUnit = isExactOutput ? buyAmountBaseUnit : context.sellAmountBaseUnit

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit: context.sellAmountBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountBaseUnit,
    allowedSwapperNames,
    refetchInterval: ratesRefetchInterval,
    // Rates carry no destination, so a missing address is no reason not to price a route - but a
    // locked one the buy chain rejects is, since nothing can be quoted until it changes
    enabled:
      !!amountBaseUnit &&
      amountBaseUnit !== '0' &&
      !isReceiveAddressBlocked &&
      (isSellAssetEvm || isSellAssetUtxo || isSellAssetSolana),
  })

  const {
    data: sellAssetBalance,
    isLoading: isSellBalanceLoading,
    refetch: refetchSellBalance,
  } = useMultiChainBalance(
    evmAddress,
    bitcoinAddress,
    solanaAddress,
    sellAsset.assetId,
    sellAsset.precision,
  )

  const buyAssetAddressForBalance = useMemo(() => {
    if (buyChainType === 'evm') return receiveAddress || evmAddress
    if (buyChainType === 'utxo') return receiveAddress || bitcoinAddress
    if (buyChainType === 'solana') return receiveAddress || solanaAddress
    return receiveAddress
  }, [buyChainType, receiveAddress, evmAddress, bitcoinAddress, solanaAddress])

  const {
    data: buyAssetBalance,
    isLoading: isBuyBalanceLoading,
    refetch: refetchBuyBalance,
  } = useMultiChainBalance(
    buyChainType === 'evm' ? buyAssetAddressForBalance : evmAddress,
    buyChainType === 'utxo' ? buyAssetAddressForBalance : bitcoinAddress,
    buyChainType === 'solana' ? buyAssetAddressForBalance : solanaAddress,
    buyAsset.assetId,
    buyAsset.precision,
  )

  const { data: sellChainInfo } = useChainInfo(sellAsset.chainId)
  const { data: buyChainInfo } = useChainInfo(buyAsset.chainId)

  const displayRate = useMemo(() => selectedRate ?? rates?.[0], [selectedRate, rates])
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  // Exact output has no user-entered sell amount - it only exists once a route has priced it
  const sellAmountBaseUnit = isExactOutput
    ? displayRate?.sellAmountCryptoBaseUnit
    : context.sellAmountBaseUnit

  const sellChainNativeAsset = useMemo(() => getBaseAsset(sellAsset.chainId), [sellAsset.chainId])

  const assetIdsForPrices = useMemo(() => {
    const ids = [sellAsset.assetId, buyAsset.assetId]
    if (sellChainNativeAsset && sellChainNativeAsset.assetId !== sellAsset.assetId) {
      ids.push(sellChainNativeAsset.assetId)
    }
    return ids
  }, [sellAsset.assetId, buyAsset.assetId, sellChainNativeAsset])

  const { data: marketData } = useMarketData(assetIdsForPrices)
  const sellAssetMarketDataPrice = marketData?.[sellAsset.assetId]?.price
  const sellAssetUsdPrice =
    sellAssetMarketDataPrice && bn(sellAssetMarketDataPrice).gt(0)
      ? sellAssetMarketDataPrice
      : undefined
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

  return useMemo(
    () => ({
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
      isExactOutput,
      sellAmountBaseUnit,
      sellChainNativeAsset,
      networkFeeDisplay,
      sellUsdValue,
      buyUsdValue,
      sellAssetUsdPrice,
      buyAssetUsdPrice,
      sellBalanceFiatValue,
      buyBalanceFiatValue,
    }),
    [
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
      isExactOutput,
      sellAmountBaseUnit,
      sellChainNativeAsset,
      networkFeeDisplay,
      sellUsdValue,
      buyUsdValue,
      sellAssetUsdPrice,
      buyAssetUsdPrice,
      sellBalanceFiatValue,
      buyBalanceFiatValue,
    ],
  )
}
