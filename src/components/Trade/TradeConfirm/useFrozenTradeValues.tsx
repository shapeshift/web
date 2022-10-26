import { useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import type { TS } from 'components/Trade/types'

export const useFrozenTradeValues = () => {
  const { control } = useFormContext<TS>()
  const formTrade = useWatch({ control, name: 'trade' })
  const formFees = useWatch({ control, name: 'fees' })
  const formSellAssetFiatRate = useWatch({ control, name: 'sellAssetFiatRate' })
  const formFeeAssetFiatRate = useWatch({ control, name: 'feeAssetFiatRate' })
  const formBuyAssetFiatRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const formSlippage = useWatch({ control, name: 'slippage' })
  const formBuyAssetAccountId = useWatch({ control, name: 'buyAssetAccountId' })
  const formSellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const formBuyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })

  const [frozenTradeAmountConstants, setFrozenTradeAmountConstants] =
    useState<ReturnType<typeof getTradeAmountConstants>>()
  const [frozenTrade, setFrozenTrade] = useState<TS['trade']>()
  const [frozenFees, setFrozenFees] = useState<TS['fees']>()
  const [frozenSellAssetFiatRate, setFrozenSellAssetFiatRate] = useState<TS['sellAssetFiatRate']>()
  const [frozenBuyAssetFiatRate, setFrozenBuyAssetFiatRate] = useState<TS['buyAssetFiatRate']>()
  const [frozenFeeAssetFiatRate, setFrozenFeeAssetFiatRate] = useState<TS['feeAssetFiatRate']>()
  const [frozenSlippage, setFrozenSlippage] = useState<TS['slippage']>()
  const [frozenBuyAssetAccountId, setFrozenBuyAssetAccountId] = useState<TS['buyAssetAccountId']>()
  const [frozenSellAssetAccountId, setFrozenSellAssetAccountId] =
    useState<TS['sellAssetAccountId']>()
  const [frozenBuyTradeAsset, setFrozenBuyTradeAsset] = useState<TS['buyTradeAsset']>()

  const tradeAmountConstants = useGetTradeAmounts()

  useEffect(() => {
    !frozenTradeAmountConstants && setFrozenTradeAmountConstants(tradeAmountConstants)
    !frozenTrade && setFrozenTrade(formTrade)
    !frozenFees && setFrozenFees(formFees)
    !frozenSellAssetFiatRate && setFrozenSellAssetFiatRate(formSellAssetFiatRate)
    !frozenBuyAssetFiatRate && setFrozenBuyAssetFiatRate(formBuyAssetFiatRate)
    !frozenFeeAssetFiatRate && setFrozenFeeAssetFiatRate(formFeeAssetFiatRate)
    !frozenSlippage && setFrozenSlippage(formSlippage)
    !frozenBuyAssetAccountId && setFrozenBuyAssetAccountId(formBuyAssetAccountId)
    !frozenSellAssetAccountId && setFrozenSellAssetAccountId(formSellAssetAccountId)
    !frozenBuyTradeAsset && setFrozenBuyTradeAsset(formBuyTradeAsset)
  }, [
    formBuyAssetAccountId,
    formBuyAssetFiatRate,
    formBuyTradeAsset,
    formFeeAssetFiatRate,
    formFees,
    formSellAssetAccountId,
    formSellAssetFiatRate,
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
    () => frozenSellAssetFiatRate ?? formSellAssetFiatRate,
    [frozenSellAssetFiatRate, formSellAssetFiatRate],
  )
  const buyAssetFiatRate = useMemo(
    () => frozenBuyAssetFiatRate ?? formBuyAssetFiatRate,
    [frozenBuyAssetFiatRate, formBuyAssetFiatRate],
  )
  const feeAssetFiatRate = useMemo(
    () => frozenFeeAssetFiatRate ?? formFeeAssetFiatRate,
    [frozenFeeAssetFiatRate, formFeeAssetFiatRate],
  )
  const slippage = useMemo(() => frozenSlippage ?? formSlippage, [frozenSlippage, formSlippage])
  const buyAssetAccountId = useMemo(
    () => frozenBuyAssetAccountId ?? formBuyAssetAccountId,
    [frozenBuyAssetAccountId, formBuyAssetAccountId],
  )
  const sellAssetAccountId = useMemo(
    () => frozenSellAssetAccountId ?? formSellAssetAccountId,
    [frozenSellAssetAccountId, formSellAssetAccountId],
  )
  const buyTradeAsset = useMemo(
    () => frozenBuyTradeAsset ?? formBuyTradeAsset,
    [frozenBuyTradeAsset, formBuyTradeAsset],
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
