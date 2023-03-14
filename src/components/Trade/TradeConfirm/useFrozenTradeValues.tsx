import { useEffect, useMemo, useState } from 'react'
import type { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import type { SwapperStore } from 'state/zustand/swapperStore/types'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useFrozenTradeValues = () => {
  const stateBuyAssetAccountId = useSwapperStore(state => state.buyAssetAccountId)
  const stateSellAssetAccountId = useSwapperStore(state => state.sellAssetAccountId)
  const stateSellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const stateBuyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const stateFeeAssetFiatRate = useSwapperStore(state => state.feeAssetFiatRate)
  const stateSlippage = useSwapperStore(state => state.slippage)
  const stateFees = useSwapperStore(state => state.fees)
  const stateTrade = useSwapperStore(state => state.trade)
  const stateBuyAmountCryptoPrecision = useSwapperStore(state => state.buyAmountCryptoPrecision)

  const [frozenTradeAmountConstants, setFrozenTradeAmountConstants] =
    useState<ReturnType<typeof getTradeAmountConstants>>()
  const [frozenTrade, setFrozenTrade] = useState<SwapperStore['trade']>()
  const [frozenFees, setFrozenFees] = useState<SwapperStore['fees']>()
  const [frozenSellAssetFiatRate, setFrozenSellAssetFiatRate] =
    useState<SwapperStore['sellAssetFiatRate']>()
  const [frozenBuyAssetFiatRate, setFrozenBuyAssetFiatRate] =
    useState<SwapperStore['buyAssetFiatRate']>()
  const [frozenFeeAssetFiatRate, setFrozenFeeAssetFiatRate] =
    useState<SwapperStore['feeAssetFiatRate']>()
  const [frozenSlippage, setFrozenSlippage] = useState<SwapperStore['slippage']>()
  const [frozenBuyAssetAccountId, setFrozenBuyAssetAccountId] =
    useState<SwapperStore['buyAssetAccountId']>()
  const [frozenSellAssetAccountId, setFrozenSellAssetAccountId] =
    useState<SwapperStore['sellAssetAccountId']>()
  const [frozenBuyAmountCryptoPrecision, setFrozenBuyTradeAsset] =
    useState<SwapperStore['buyAmountCryptoPrecision']>()

  const tradeAmountConstants = useGetTradeAmounts()

  useEffect(() => {
    !frozenTradeAmountConstants && setFrozenTradeAmountConstants(tradeAmountConstants)
    !frozenTrade && setFrozenTrade(stateTrade)
    !frozenFees && setFrozenFees(stateFees)
    !frozenSellAssetFiatRate && setFrozenSellAssetFiatRate(stateSellAssetFiatRate)
    !frozenBuyAssetFiatRate && setFrozenBuyAssetFiatRate(stateBuyAssetFiatRate)
    !frozenFeeAssetFiatRate && setFrozenFeeAssetFiatRate(stateFeeAssetFiatRate)
    !frozenSlippage && setFrozenSlippage(stateSlippage)
    !frozenBuyAssetAccountId && setFrozenBuyAssetAccountId(stateBuyAssetAccountId)
    !frozenSellAssetAccountId && setFrozenSellAssetAccountId(stateSellAssetAccountId)
    !frozenBuyAmountCryptoPrecision && setFrozenBuyTradeAsset(stateBuyAmountCryptoPrecision)
  }, [
    stateBuyAssetAccountId,
    stateBuyAssetFiatRate,
    stateFeeAssetFiatRate,
    stateFees,
    stateSellAssetAccountId,
    stateSellAssetFiatRate,
    stateSlippage,
    stateTrade,
    frozenBuyAssetAccountId,
    frozenBuyAssetFiatRate,
    frozenFeeAssetFiatRate,
    frozenFees,
    frozenSellAssetAccountId,
    frozenSellAssetFiatRate,
    frozenSlippage,
    frozenTrade,
    frozenTradeAmountConstants,
    tradeAmountConstants,
    frozenBuyAmountCryptoPrecision,
    stateBuyAmountCryptoPrecision,
  ])

  // If an executed value exists we want to ignore any subsequent updates and use the executed value
  const tradeAmounts = useMemo(
    () => frozenTradeAmountConstants ?? tradeAmountConstants,
    [frozenTradeAmountConstants, tradeAmountConstants],
  )
  const trade = useMemo(() => frozenTrade ?? stateTrade, [frozenTrade, stateTrade])
  const fees = useMemo(() => frozenFees ?? stateFees, [frozenFees, stateFees])
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
  const slippage = useMemo(() => frozenSlippage ?? stateSlippage, [frozenSlippage, stateSlippage])
  const buyAssetAccountId = useMemo(
    () => frozenBuyAssetAccountId ?? stateBuyAssetAccountId,
    [frozenBuyAssetAccountId, stateBuyAssetAccountId],
  )
  const sellAssetAccountId = useMemo(
    () => frozenSellAssetAccountId ?? stateSellAssetAccountId,
    [frozenSellAssetAccountId, stateSellAssetAccountId],
  )
  const buyAmountCryptoPrecision = useMemo(
    () => frozenBuyAmountCryptoPrecision ?? stateBuyAmountCryptoPrecision,
    [frozenBuyAmountCryptoPrecision, stateBuyAmountCryptoPrecision],
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
    buyAmountCryptoPrecision,
  }
}
