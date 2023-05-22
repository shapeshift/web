import { ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapperName } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN } from 'lib/swapper/swappers/utils/constants'
import { selectFeeAssetByChainId } from 'state/slices/assetsSlice/selectors'
import { selectFiatToUsdRate, selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { store, useAppSelector } from 'state/store'
import { selectDonationAmountUsd } from 'state/zustand/swapperStore/amountSelectors'
import { selectSellAsset } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useDonationAmountBelowMinimum = () => {
  const runePriceUsd = useAppSelector(state => selectMarketDataById(state, thorchainAssetId)).price
  const donationAmountUsd = useSwapperStore(selectDonationAmountUsd)
  const activeSwapperName = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper.name)
  const sellAsset = useSwapperStore(selectSellAsset)
  const sellAssetChainId = sellAsset?.chainId
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, sellAssetChainId ?? ''))
  const buyAmountFiat = useSwapperStore(state => state.buyAmountFiat)
  const selectedCurrencyToUsdRate = selectFiatToUsdRate(store.getState())
  const buyAmountUsd = bnOrZero(buyAmountFiat).div(selectedCurrencyToUsdRate)

  // Some swappers have a minimum donation amount, whereby collecting below that amount will result in the donated amount being lost
  const isDonationAmountBelowMinimum = useMemo(() => {
    switch (activeSwapperName) {
      case SwapperName.Thorchain: {
        return bnOrZero(donationAmountUsd)
          .div(runePriceUsd)
          .lte(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN)
      }
      case SwapperName.Zrx:
      case SwapperName.OneInch:
        return (
          feeAsset?.assetId === ethAssetId &&
          buyAmountUsd.lt(MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN)
        )
      default:
        return false
    }
  }, [activeSwapperName, buyAmountUsd, donationAmountUsd, feeAsset?.assetId, runePriceUsd])

  return isDonationAmountBelowMinimum
}
