import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, TradeQuoteStep } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'
import { selectCryptoMarketData, selectFeeAssetById } from 'state/slices/selectors'
import {
  selectHopTotalNetworkFeeFiatPrecision,
  selectHopTotalProtocolFeesFiatPrecision,
  selectQuoteDonationAmountUsd,
  selectTradeExecutionStatus,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { MultiHopExecutionStatus } from 'state/slices/tradeQuoteSlice/types'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { useMockAllowanceApproval, useMockTradeExecution } from '../hooks/mockHooks'
import { TradeType } from '../types'
import { Hop } from './Hop'
import {
  getApprovalStep,
  getAssetSummaryStep,
  getDonationSummaryStep,
  getHopSummaryStep,
} from './steps'

export const FirstHop = ({
  swapperName,
  tradeQuoteStep,
  isMultiHopTrade,
  isOpen,
  onToggleIsOpen,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  isMultiHopTrade: boolean
  isOpen: boolean
  onToggleIsOpen: () => void
}) => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)
  const donationAmountUsd = useAppSelector(selectQuoteDonationAmountUsd)
  const {
    // TODO: use the message to better ux
    // message,
    buyTxHash,
    sellTxHash,
    tradeStatus,
    executeTrade,
  } = useMockTradeExecution() // TODO: use the real hook here

  // TODO: use `isApprovalNeeded === undefined` here to display placeholder loading during initial approval check
  const {
    wasApprovalNeeded,
    // isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalTxStatus: _approvalTxStatus,
    approvalNetworkFeeCryptoBaseUnit,
  } = useMockAllowanceApproval(tradeQuoteStep, true, isExactAllowance) // TODO: use the real hook here

  const handleSignTx = useCallback(async () => {
    // next state
    dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())

    // execute the transaction for the current hop
    await executeTrade()
  }, [dispatch, executeTrade])

  const handleSignAllowanceApproval = useCallback(async () => {
    // next state
    dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())

    // execute the allowance approval
    await executeAllowanceApproval()

    // next state
    dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())
  }, [dispatch, executeAllowanceApproval])

  useEffect(() => {
    if (tradeStatus === TxStatus.Confirmed) {
      dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())
    }
  }, [dispatch, tradeStatus])

  const shouldRenderDonation = bnOrZero(donationAmountUsd).gt(0)
  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const fiatPriceByAssetId = useAppSelector(selectCryptoMarketData)

  // increment the trade state if approval is not needed
  useEffect(() => {
    if (
      !wasApprovalNeeded &&
      [
        MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation,
        MultiHopExecutionStatus.Hop1AwaitingApprovalExecution,
      ].includes(tradeExecutionStatus)
    ) {
      dispatch(tradeQuoteSlice.actions.incrementTradeExecutionState())
    }
  }, [dispatch, wasApprovalNeeded, tradeExecutionStatus])

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
      case MultiHopExecutionStatus.Previewing:
        return -Infinity
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
        return 1
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return wasApprovalNeeded ? 2 : 1
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, wasApprovalNeeded])

  const {
    buyAsset: stepBuyAsset,
    sellAsset: stepSellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit,
    estimatedExecutionTimeMs,
    source,
  } = tradeQuoteStep

  const { txLink, txHash } = useMemo(() => {
    if (buyTxHash)
      return {
        txLink: getTxLink({
          name: source,
          defaultExplorerBaseUrl: stepSellAsset.explorerTxLink ?? '',
          tradeId: buyTxHash,
        }),
        txHash: buyTxHash,
      }
    if (sellTxHash)
      return {
        txLink: getTxLink({
          name: source,
          defaultExplorerBaseUrl: stepSellAsset.explorerTxLink ?? '',
          tradeId: sellTxHash,
        }),
        txHash: buyTxHash,
      }

    return {}
  }, [buyTxHash, sellTxHash, stepSellAsset.explorerTxLink, source])

  // the txStatus needs to be undefined before the tx is executed to handle "ready" but not "executing" status
  const approvalTxStatus =
    tradeExecutionStatus >= MultiHopExecutionStatus.Hop1AwaitingApprovalExecution
      ? _approvalTxStatus
      : undefined

  // the txStatus needs to be undefined before the tx is executed to handle "ready" but not "executing" status
  const txStatus =
    tradeExecutionStatus >= MultiHopExecutionStatus.Hop1AwaitingTradeExecution
      ? tradeStatus
      : undefined

  const steps = useMemo(() => {
    const sellAmountCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      stepSellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      stepBuyAsset.precision,
    )
    const sellAmountCryptoFormatted = toCrypto(sellAmountCryptoPrecision, stepSellAsset.symbol)
    const buyAmountCryptoFormatted = toCrypto(buyAmountCryptoPrecision, stepBuyAsset.symbol)

    const buyAssetFiatRate = fiatPriceByAssetId[stepBuyAsset.assetId]?.price ?? '0'
    const buyAmountFiatFormatted = toFiat(
      bn(buyAmountCryptoPrecision).times(buyAssetFiatRate).toString(),
    )

    const sellAssetFiatRate = fiatPriceByAssetId[stepSellAsset.assetId]?.price ?? '0'
    const sellAmountFiatFormatted = toFiat(
      bn(sellAmountCryptoPrecision).times(sellAssetFiatRate).toString(),
    )

    const hopSteps = [
      getAssetSummaryStep({
        amountCryptoFormatted: sellAmountCryptoFormatted,
        amountFiatFormatted: sellAmountFiatFormatted,
        asset: stepSellAsset,
      }),
    ]

    if (wasApprovalNeeded) {
      const feeAsset = selectFeeAssetById(store.getState(), stepSellAsset.assetId)
      const approvalNetworkFeeCryptoFormatted =
        feeAsset && approvalNetworkFeeCryptoBaseUnit
          ? toCrypto(
              fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
              feeAsset.symbol,
            )
          : ''
      hopSteps.push(
        getApprovalStep({
          txHash: approvalTxId,
          txStatus: approvalTxStatus,
          approvalNetworkFeeCryptoFormatted,
          isExactAllowance,
          translate,
          toggleIsExactAllowance,
          onSign: handleSignAllowanceApproval,
        }),
      )
    }

    hopSteps.push(
      getHopSummaryStep({
        swapperName,
        stepBuyAssetChainId: stepBuyAsset.chainId,
        stepSellAssetChainId: stepSellAsset.chainId,
        stepBuyAmountCryptoFormatted: buyAmountCryptoFormatted,
        stepSellAmountCryptoFormatted: sellAmountCryptoFormatted,

        txHash,
        txLink,
        txStatus,
        onSign: handleSignTx,
      }),
    )

    if (!isMultiHopTrade) {
      if (shouldRenderDonation) {
        hopSteps.push(
          getDonationSummaryStep({
            donationAmountFiatFormatted: toFiat(donationAmountUsd),
          }),
        )
      }

      hopSteps.push(
        getAssetSummaryStep({
          amountCryptoFormatted: buyAmountCryptoFormatted,
          amountFiatFormatted: buyAmountFiatFormatted,
          asset: stepBuyAsset,
        }),
      )
    }

    return hopSteps
  }, [
    approvalNetworkFeeCryptoBaseUnit,
    approvalTxId,
    approvalTxStatus,
    buyAmountBeforeFeesCryptoBaseUnit,
    stepBuyAsset,
    donationAmountUsd,
    fiatPriceByAssetId,
    handleSignAllowanceApproval,
    handleSignTx,
    isExactAllowance,
    isMultiHopTrade,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    stepSellAsset,
    shouldRenderDonation,
    swapperName,
    toCrypto,
    toFiat,
    toggleIsExactAllowance,
    translate,
    txHash,
    txLink,
    txStatus,
    wasApprovalNeeded,
  ])

  const slippageDecimalPercentage = useMemo(
    () => getDefaultSlippageDecimalPercentageForSwapper(swapperName),
    [swapperName],
  )

  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), 0)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(store.getState(), 0)

  const isBridge = stepBuyAsset.chainId !== stepSellAsset.chainId
  const tradeType = isBridge ? TradeType.Bridge : TradeType.Swap

  return (
    <Hop
      steps={steps}
      activeStep={activeStep}
      slippageDecimalPercentage={slippageDecimalPercentage}
      networkFeeFiatPrecision={networkFeeFiatPrecision ?? '0'}
      protocolFeeFiatPrecision={protocolFeeFiatPrecision ?? '0'}
      hopIndex={0}
      title={`${tradeType} via ${swapperName}`}
      txStatus={txStatus}
      isOpen={isOpen}
      onToggleIsOpen={onToggleIsOpen}
      estimatedExecutionTimeMs={estimatedExecutionTimeMs}
    />
  )
}
