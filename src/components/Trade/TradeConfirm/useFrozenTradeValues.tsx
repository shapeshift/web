import { useEffect, useMemo, useState } from 'react'
import type { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import { useSwapperState } from 'components/Trade/SwapperProvider/swapperProvider'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'
import type { SwapperStore } from 'state/zustand/swapperStore/types'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useFrozenTradeValues = () => {
  const {
    state: { fees: stateFees, trade: stateTrade },
  } = useSwapperState()

  const stateBuyAssetAccountId = useSwapperStore(state => state.buyAssetAccountId)
  const stateSellAssetAccountId = useSwapperStore(state => state.sellAssetAccountId)
  const stateSellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const stateBuyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const stateFeeAssetFiatRate = useSwapperStore(state => state.feeAssetFiatRate)
  const stateBuyTradeAsset = useSwapperStore(state => state.buyTradeAsset)
  const stateSlippage = useSwapperStore(state => state.slippage)

  const [frozenTradeAmountConstants, setFrozenTradeAmountConstants] =
    useState<ReturnType<typeof getTradeAmountConstants>>()
  const [frozenTrade, setFrozenTrade] = useState<SwapperState['trade']>()
  const [frozenFees, setFrozenFees] = useState<SwapperState['fees']>()
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
  const [frozenBuyTradeAsset, setFrozenBuyTradeAsset] = useState<SwapperStore['buyTradeAsset']>()

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
    !frozenBuyTradeAsset && setFrozenBuyTradeAsset(stateBuyTradeAsset)
  }, [
    stateBuyAssetAccountId,
    stateBuyAssetFiatRate,
    stateBuyTradeAsset,
    stateFeeAssetFiatRate,
    stateFees,
    stateSellAssetAccountId,
    stateSellAssetFiatRate,
    stateSlippage,
    stateTrade,
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
