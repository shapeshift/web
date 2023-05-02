import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { SwapperName } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'
import { selectDonationAmountFiat } from 'state/zustand/swapperStore/amountSelectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useDonationAmountBelowMinimum = () => {
  const runePrice = useAppSelector(state => selectMarketDataById(state, thorchainAssetId)).price
  const donationAmountFiat = useSwapperStore(selectDonationAmountFiat)
  const activeSwapperName = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper.name)

  // Some swappers have a minimum donation amount, whereby collecting below that amount will result in the donated amount being lost
  const isDonationAmountBelowMinimum = useMemo(() => {
    switch (activeSwapperName) {
      case SwapperName.Thorchain: {
        return bnOrZero(donationAmountFiat)
          .div(runePrice)
          .lte(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN)
      }
      default:
        return false
    }
  }, [activeSwapperName, donationAmountFiat, runePrice])

  return isDonationAmountBelowMinimum
}
