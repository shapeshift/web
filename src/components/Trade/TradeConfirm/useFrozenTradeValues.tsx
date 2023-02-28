import { useEffect, useMemo, useState } from 'react'
import type { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'

export const useFrozenTradeValues = () => {
  const {
    buyTradeAsset: stateBuyTradeAsset,
    buyAssetAccountId: stateBuyAssetAccountId,
    sellAssetAccountId: stateSellAssetAccountId,
    sellAssetFiatRate: stateSellAssetFiatRate,
    feeAssetFiatRate: stateFeeAssetFiatRate,
    buyAssetFiatRate: stateBuyAssetFiatRate,
    fees: formFees,
    trade: formTrade,
    slippage: formSlippage,
  } = useSwapperState()

  const [frozenTradeAmountConstants, setFrozenTradeAmountConstants] =
    useState<ReturnType<typeof getTradeAmountConstants>>()
  const [frozenTrade, setFrozenTrade] = useState<SwapperState['trade']>()
  const [frozenFees, setFrozenFees] = useState<SwapperState['fees']>()
  const [frozenSellAssetFiatRate, setFrozenSellAssetFiatRate] =
    useState<SwapperState['sellAssetFiatRate']>()
  const [frozenBuyAssetFiatRate, setFrozenBuyAssetFiatRate] =
    useState<SwapperState['buyAssetFiatRate']>()
  const [frozenFeeAssetFiatRate, setFrozenFeeAssetFiatRate] =
    useState<SwapperState['feeAssetFiatRate']>()
  const [frozenSlippage, setFrozenSlippage] = useState<SwapperState['slippage']>()
  const [frozenBuyAssetAccountId, setFrozenBuyAssetAccountId] =
    useState<SwapperState['buyAssetAccountId']>()
  const [frozenSellAssetAccountId, setFrozenSellAssetAccountId] =
    useState<SwapperState['sellAssetAccountId']>()
  const [frozenBuyTradeAsset, setFrozenBuyTradeAsset] = useState<SwapperState['buyTradeAsset']>()

  const tradeAmountConstants = useGetTradeAmounts()

  useEffect(() => {
    !frozenTradeAmountConstants && setFrozenTradeAmountConstants(tradeAmountConstants)
    !frozenTrade && setFrozenTrade(formTrade)
    !frozenFees && setFrozenFees(formFees)
    !frozenSellAssetFiatRate && setFrozenSellAssetFiatRate(stateSellAssetFiatRate)
    !frozenBuyAssetFiatRate && setFrozenBuyAssetFiatRate(stateBuyAssetFiatRate)
    !frozenFeeAssetFiatRate && setFrozenFeeAssetFiatRate(stateFeeAssetFiatRate)
    !frozenSlippage && setFrozenSlippage(formSlippage)
    !frozenBuyAssetAccountId && setFrozenBuyAssetAccountId(stateBuyAssetAccountId)
    !frozenSellAssetAccountId && setFrozenSellAssetAccountId(stateSellAssetAccountId)
    !frozenBuyTradeAsset && setFrozenBuyTradeAsset(stateBuyTradeAsset)
  }, [
    stateBuyAssetAccountId,
    stateBuyAssetFiatRate,
    stateBuyTradeAsset,
    stateFeeAssetFiatRate,
    formFees,
    stateSellAssetAccountId,
    stateSellAssetFiatRate,
    formSlippage,
    formTrade,
    frozenBuyAssetAccountId,
    frozenBuyAssetFiatRate,
    frozenBuyTradeAsset,
    frozenFeeAssetFiatRate,
    frozenFees,
    frozenSellAssetAccountId,
    frozenSellAssetFiatRate,
    frozenSlippage,
    frozenTrade,
    frozenTradeAmountConstants,
    tradeAmountConstants,
  ])

  // If an executed value exists we want to ignore any subsequent updates and use the executed value
  const tradeAmounts = useMemo(
    () => frozenTradeAmountConstants ?? tradeAmountConstants,
    [frozenTradeAmountConstants, tradeAmountConstants],
  )
  const trade = useMemo(() => frozenTrade ?? formTrade, [frozenTrade, formTrade])
  const fees = useMemo(() => frozenFees ?? formFees, [frozenFees, formFees])
  const sellAssetFiatRate = useMemo(
    () => frozenSellAssetFiatRate ?? stateSellAssetFiatRate,
    [frozenSellAssetFiatRate, stateSellAssetFiatRate],
  )
  const buyAssetFiatRate = useMemo(
    () => frozenBuyAssetFiatRate ?? stateBuyAssetFiatRate,
    [frozenBuyAssetFiatRate, stateBuyAssetFiatRate],
  )
  const feeAssetFiatRate = useMemo(
    () => frozenFeeAssetFiatRate ?? stateFeeAssetFiatRate,
    [frozenFeeAssetFiatRate, stateFeeAssetFiatRate],
  )
  const slippage = useMemo(() => frozenSlippage ?? formSlippage, [frozenSlippage, formSlippage])
  const buyAssetAccountId = useMemo(
    () => frozenBuyAssetAccountId ?? stateBuyAssetAccountId,
    [frozenBuyAssetAccountId, stateBuyAssetAccountId],
  )
  const sellAssetAccountId = useMemo(
    () => frozenSellAssetAccountId ?? stateSellAssetAccountId,
    [frozenSellAssetAccountId, stateSellAssetAccountId],
  )
  const buyTradeAsset = useMemo(
    () => frozenBuyTradeAsset ?? stateBuyTradeAsset,
    [frozenBuyTradeAsset, stateBuyTradeAsset],
  )

  return {
    tradeAmounts,
    trade,
    fees,
    sellAssetFiatRate,
    buyAssetFiatRate,
    feeAssetFiatRate,
    slippage,
    buyAssetAccountId,
    sellAssetAccountId,
    buyTradeAsset,
  }
}
