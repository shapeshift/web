import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { SwapperName, TradeQuote2 } from 'lib/swapper/api'
import { TradeExecution, TradeExecutionEvent } from 'lib/swapper/tradeExecution'
import {
  selectPortfolioAccountMetadataByAccountId,
  selectUsdRateByAssetId,
} from 'state/slices/selectors'
import {
  selectActiveStepOrDefault,
  selectFirstHopSellFeeAsset,
  selectIsLastStep,
  selectLastHopBuyAsset,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../useAccountIds'

export const useTradeExecution = ({
  swapperName,
  tradeQuote,
}: {
  swapperName?: SwapperName
  tradeQuote?: TradeQuote2
}) => {
  const dispatch = useAppDispatch()

  const [sellTxHash, setSellTxHash] = useState<string | undefined>()
  const [buyTxHash, setBuyTxHash] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [tradeStatus, setTradeStatus] = useState<TxStatus>(TxStatus.Unknown)
  const wallet = useWallet().state.wallet
  const slippageTolerancePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const { showErrorToast } = useErrorHandler()

  const buyAsset = useAppSelector(selectLastHopBuyAsset)
  const feeAsset = useAppSelector(selectFirstHopSellFeeAsset)

  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const buyAssetUsdRate = useAppSelector(state =>
    buyAsset ? selectUsdRateByAssetId(state, buyAsset.assetId) : undefined,
  )

  const feeAssetUsdRate = useAppSelector(state =>
    feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined,
  )

  const activeStepOrDefault = useAppSelector(selectActiveStepOrDefault)
  const isLastStep = useAppSelector(selectIsLastStep)

  // This is ugly, but we need to use refs to get around the fact that the
  // poll fn effectively creates a closure and will hold stale variables forever
  // Unless we use refs or another way to get around the closure (e.g hijacking `this`, we are doomed)
  const sellTxHashRef = useRef<string | undefined>()
  const isLastStepRef = useRef<boolean>(false)
  const cancelPollingRef = useRef<() => void | undefined>()

  // cancel on component unmount so polling doesn't cause chaos after the component has unmounted
  useEffect(() => {
    return cancelPollingRef.current
  }, [])

  const executeTrade = useCallback(async () => {
    if (!wallet) throw Error('missing wallet')
    if (!buyAssetUsdRate) throw Error('missing buyAssetUsdRate')
    if (!feeAssetUsdRate) throw Error('missing feeAssetUsdRate')
    if (!accountMetadata) throw Error('missing accountMetadata')
    if (!tradeQuote) throw Error('missing tradeQuote')
    if (!swapperName) throw Error('missing swapperName')
    if (!sellAssetAccountId) throw Error('missing sellAssetAccountId')
    if (!buyAssetAccountId) throw Error('missing buyAssetAccountId')

    const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

    return new Promise<void>(async (resolve, reject) => {
      const execution = new TradeExecution()

      execution.on(TradeExecutionEvent.Error, reject)
      execution.on(TradeExecutionEvent.SellTxHash, ({ sellTxHash }) => {
        setSellTxHash(sellTxHash)
      })
      execution.on(TradeExecutionEvent.Status, ({ status, message, buyTxHash }) => {
        // TODO(gomes): do we want to bring in the concept of watching for a step execution in addition to trade execution?
        // useTradeExecution seems to revolve around the idea of a holistic trade execution i.e a sell/buy asset for the whole trade,
        // but we may want to make this granular to the step level?
        if (isLastStepRef.current || status === TxStatus.Failed) {
          setMessage(message)
          setBuyTxHash(buyTxHash)
          setTradeStatus(status)
        }

        // Tx confirmed/pending for a mid-trade hop, meaning the trade is still pending holistically
        else if (status === TxStatus.Confirmed || status === TxStatus.Pending) {
          setTradeStatus(TxStatus.Pending)
        }
      })
      execution.on(TradeExecutionEvent.Success, () => {
        dispatch(tradeQuoteSlice.actions.incrementStep())
        resolve()
      })
      execution.on(TradeExecutionEvent.Fail, cause => {
        reject(new Error('Transaction failed', { cause }))
      })

      // execute the trade and attach then cancel callback
      cancelPollingRef.current = await execution.exec({
        swapperName,
        tradeQuote,
        stepIndex: activeStepOrDefault,
        accountMetadata,
        quoteSellAssetAccountId: sellAssetAccountId,
        quoteBuyAssetAccountId: buyAssetAccountId,
        wallet,
        supportsEIP1559,
        buyAssetUsdRate,
        feeAssetUsdRate,
        slippageTolerancePercentageDecimal,
        getState: store.getState,
      })
    })
  }, [
    wallet,
    buyAssetUsdRate,
    feeAssetUsdRate,
    accountMetadata,
    tradeQuote,
    swapperName,
    activeStepOrDefault,
    slippageTolerancePercentageDecimal,
    dispatch,
    sellAssetAccountId,
    buyAssetAccountId,
  ])

  useEffect(() => {
    sellTxHashRef.current = sellTxHash
    isLastStepRef.current = isLastStep
  }, [sellTxHash, isLastStep])

  useEffect(() => {
    // First step will always be ran from the executeTrade call fired by onSubmit()
    // Subsequent steps will be ran here, following incrementStep() after step completion
    if (activeStepOrDefault !== 0) {
      void executeTrade().catch(showErrorToast)
    }
  }, [activeStepOrDefault, executeTrade, showErrorToast])

  return { executeTrade, sellTxHash, buyTxHash, message, tradeStatus }
}
