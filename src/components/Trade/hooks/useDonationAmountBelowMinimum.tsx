import { ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { useMemo } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapperName } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN } from 'lib/swapper/swappers/utils/constants'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFiatToUsdRate, selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { store, useAppSelector } from 'state/store'
import { selectDonationAmountFiat } from 'state/zustand/swapperStore/amountSelectors'
import { selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useDonationAmountBelowMinimum = () => {
  const runePriceFiat = useAppSelector(state => selectMarketDataById(state, thorchainAssetId)).price
  const donationAmountFiat = useSwapperStore(selectDonationAmountFiat)
  const activeSwapperName = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper.name)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetChainId = sellAsset?.chainId
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))
  const buyAmountFiat = useSwapperStore(state => state.buyAmountFiat)
  const selectedCurrencyToUsdRate = selectFiatToUsdRate(store.getState())
  const buyAmountUsd = bnOrZero(buyAmountFiat).div(selectedCurrencyToUsdRate)
  const wallet = useWallet().state.wallet
  const walletIsKeepKey = wallet && isKeepKey(wallet)

  // Some swappers have a minimum donation amount, whereby collecting below that amount will result in the donated amount being lost
  const isDonationAmountBelowMinimum = useMemo(() => {
    switch (activeSwapperName) {
      case SwapperName.Thorchain: {
        return bnOrZero(donationAmountFiat)
          .div(runePriceFiat)
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
    donationAmountFiat,
    feeAsset?.assetId,
    runePriceFiat,
    walletIsKeepKey,
  ])

  return isDonationAmountBelowMinimum
}
