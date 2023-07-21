import { ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapperName } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN } from 'lib/swapper/swappers/utils/constants'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import {
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { store, useAppSelector } from 'state/store'
import { selectDonationAmountUserCurrency } from 'state/zustand/swapperStore/amountSelectors'
import { selectActiveSwapperName, selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useDonationAmountBelowMinimum = () => {
  const runePriceUserCurrency = useAppSelector(state =>
    selectMarketDataById(state, thorchainAssetId),
  ).price
  const donationAmountUserCurrency = useSwapperStore(selectDonationAmountUserCurrency)
  const activeSwapperName = useSwapperStore(selectActiveSwapperName)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetChainId = sellAsset?.chainId
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))
  const buyAmountUserCurrency = useSwapperStore(state => state.buyAmountUserCurrency)
  const selectedCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
  const buyAmountUsd = bnOrZero(buyAmountUserCurrency).div(selectedCurrencyToUsdRate)
  const wallet = useWallet().state.wallet
  const walletIsKeepKey = wallet && wallet.getVendor() === 'KeepKey'

  // Some swappers have a minimum donation amount, whereby collecting below that amount will result in the donated amount being lost
  const isDonationAmountBelowMinimum = useMemo(() => {
    switch (activeSwapperName) {
      case SwapperName.Thorchain: {
        return bnOrZero(donationAmountUserCurrency)
          .div(runePriceUserCurrency)
          .lte(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN)
      }
      case SwapperName.Zrx:
      case SwapperName.OneInch:
        return walletIsKeepKey
          ? // disable EVM donations on KeepKey until https://github.com/shapeshift/web/issues/4518 is resolved
            true
          : feeAsset?.assetId === ethAssetId &&
              buyAmountUsd.lt(MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN)
      default:
        return false
    }
  }, [
    activeSwapperName,
    buyAmountUsd,
    donationAmountUserCurrency,
    feeAsset?.assetId,
    runePriceUserCurrency,
    walletIsKeepKey,
  ])

  return isDonationAmountBelowMinimum
}
