import { useCallback, useEffect } from 'react'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import type { TradeAmountInputField } from 'components/Trade/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useTradeAmounts = () => {
  // Types
  type SetTradeAmountsAsynchronousArgs = {
    amount: string
    action: TradeAmountInputField
  }

  type SetTradeAmountsArgs = CalculateAmountsArgs

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const buyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const sellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const updateTradeAmounts = useSwapperStore(state => state.updateTradeAmounts)
  const fees = useSwapperStore(state => state.fees)
  const sellAssetSwapperState = useSwapperStore(state => state.sellAsset)
  const buyAssetSwapperState = useSwapperStore(state => state.buyAsset)
  const amountSwapperState = useSwapperStore(state => state.amount)
  const actionSwapperState = useSwapperStore(state => state.action)

  const setTradeAmounts = useCallback(
    (args: SetTradeAmountsArgs) => {
      const {
        sellAmountSellAssetBaseUnit,
        buyAmountBuyAssetBaseUnit,
        fiatSellAmount,
        fiatBuyAmount,
      } = calculateAmounts(args)
      const buyAmountCryptoPrecision = fromBaseUnit(
        buyAmountBuyAssetBaseUnit,
        args.buyAsset.precision,
      )
      const sellAmountCryptoPrecision = fromBaseUnit(
        sellAmountSellAssetBaseUnit,
        args.sellAsset.precision,
      )
      updateTradeAmounts({
        buyAmountCryptoPrecision,
        sellAmountCryptoPrecision,
        fiatSellAmount,
        fiatBuyAmount,
      })
    },
    [updateTradeAmounts],
  )

  // Use the existing fiat rates and quote without waiting for fresh data
  const setTradeAmountsUsingExistingData = useCallback(
    ({ amount, action }: SetTradeAmountsAsynchronousArgs) => {
      const buyAssetTradeFeeFiat = bnOrZero(fees?.buyAssetTradeFeeUsd).times(
        selectedCurrencyToUsdRate,
      )
      const sellAssetTradeFeeFiat = bnOrZero(fees?.sellAssetTradeFeeUsd).times(
        selectedCurrencyToUsdRate,
      )
      if (
        sellAssetSwapperState &&
        buyAssetSwapperState &&
        action &&
        buyAssetFiatRate &&
        sellAssetFiatRate
      ) {
        setTradeAmounts({
          amount,
          action,
          buyAsset: buyAssetSwapperState,
          sellAsset: sellAssetSwapperState,
          buyAssetFiatRate,
          sellAssetFiatRate,
          buyAssetTradeFeeFiat,
          sellAssetTradeFeeFiat,
        })
      }
    },
    [
      fees?.buyAssetTradeFeeUsd,
      fees?.sellAssetTradeFeeUsd,
      selectedCurrencyToUsdRate,
      sellAssetSwapperState,
      buyAssetSwapperState,
      buyAssetFiatRate,
      sellAssetFiatRate,
      setTradeAmounts,
    ],
  )

  useEffect(() => {
    if (!buyAssetSwapperState || !sellAssetSwapperState || !buyAssetFiatRate || !sellAssetFiatRate)
      return
    const buyAssetTradeFeeFiat = bnOrZero(fees?.buyAssetTradeFeeUsd).times(
      selectedCurrencyToUsdRate,
    )
    const sellAssetTradeFeeFiat = bnOrZero(fees?.sellAssetTradeFeeUsd).times(
      selectedCurrencyToUsdRate,
    )
    const args: CalculateAmountsArgs = {
      amount: amountSwapperState,
      buyAsset: buyAssetSwapperState,
      sellAsset: sellAssetSwapperState,
      buyAssetFiatRate,
      sellAssetFiatRate,
      action: actionSwapperState,
      buyAssetTradeFeeFiat,
      sellAssetTradeFeeFiat,
    }
    setTradeAmounts(args)
  }, [
    actionSwapperState,
    amountSwapperState,
    buyAssetFiatRate,
    buyAssetSwapperState,
    fees?.buyAssetTradeFeeUsd,
    fees?.sellAssetTradeFeeUsd,
    selectedCurrencyToUsdRate,
    sellAssetFiatRate,
    sellAssetSwapperState,
    setTradeAmounts,
  ])

  return {
    setTradeAmountsUsingExistingData,
  }
}
