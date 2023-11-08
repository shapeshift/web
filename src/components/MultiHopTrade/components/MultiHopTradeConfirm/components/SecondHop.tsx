import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useAllowanceApproval } from 'components/MultiHopTrade/hooks/useAllowanceApproval/useAllowanceApproval'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, TradeQuoteStep } from 'lib/swapper/types'
import { assertUnreachable, isSome } from 'lib/utils'
import {
  selectCryptoMarketData,
  selectFeeAssetById,
  selectTradeExecutionStatus,
} from 'state/slices/selectors'
import { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'
import {
  selectHopTotalNetworkFeeFiatPrecision,
  selectHopTotalProtocolFeesFiatPrecision,
} from 'state/slices/tradeQuoteSlice/selectors'
import { store, useAppSelector } from 'state/store'

import { useTradeExecutooor } from '../hooks/useTradeExecutor'
import { TradeType } from '../types'
import { Hop } from './Hop'
import {
  getApprovalStep,
  getAssetSummaryStep,
  getDonationSummaryStep,
  getHopSummaryStep,
} from './steps'

export const SecondHop = ({
  swapperName,
  tradeQuoteStep,
  isOpen,
  onToggleIsOpen,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  isOpen: boolean
  onToggleIsOpen: () => void
}) => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)

  // TODO: use `isApprovalNeeded === undefined` here to display placeholder loading during initial approval check
  const {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
  } = useAllowanceApproval(tradeQuoteStep, isExactAllowance)
  const shouldRenderDonation = true // TODO:
  const { onSignTrade } = useTradeExecutooor()
  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const fiatPriceByAssetId = useAppSelector(selectCryptoMarketData)

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
      case MultiHopExecutionStatus.Previewing:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return -Infinity
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
        return 2
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
        return isApprovalNeeded ? 3 : 2
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalNeeded])

  const {
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit,
  } = tradeQuoteStep

  const steps = useMemo(() => {
    const sellAmountCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )
    const sellAmountCryptoFormatted = toCrypto(sellAmountCryptoPrecision, sellAsset.symbol)
    const buyAmountCryptoFormatted = toCrypto(buyAmountCryptoPrecision, buyAsset.symbol)

    const buyAssetFiatRate = fiatPriceByAssetId[buyAsset.assetId]?.price ?? '0'
    const buyAmountFiatFormatted = toFiat(
      bn(buyAmountCryptoPrecision).times(buyAssetFiatRate).toString(),
    )

    const tradeTx =
      tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop1AwaitingTradeExecution
        ? '0x5678'
        : undefined

    const hopSteps = [
      getHopSummaryStep({
        swapperName,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted,
        sellAmountCryptoFormatted,
        txHash: tradeTx,
        txStatus: TxStatus.Unknown,
        onSign: onSignTrade,
      }),
    ].filter(isSome)

    if (isApprovalNeeded) {
      const feeAsset = selectFeeAssetById(store.getState(), sellAsset.assetId)
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
          approvalNetworkFeeCryptoFormatted,
          isExactAllowance,
          translate,
          toggleIsExactAllowance,
          onSign: executeAllowanceApproval,
        }),
      )
    }

    if (shouldRenderDonation) {
      hopSteps.push(
        getDonationSummaryStep({
          donationAmountFiatFormatted: toFiat(1.2),
        }),
      )
    }

    hopSteps.push(
      getAssetSummaryStep({
        amountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
        amountFiatFormatted: buyAmountFiatFormatted,
        asset: buyAsset,
      }),
    )

    return hopSteps
  }, [
    approvalNetworkFeeCryptoBaseUnit,
    approvalTxId,
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAsset,
    executeAllowanceApproval,
    fiatPriceByAssetId,
    isApprovalNeeded,
    isExactAllowance,
    onSignTrade,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAsset.assetId,
    sellAsset.chainId,
    sellAsset.precision,
    sellAsset.symbol,
    shouldRenderDonation,
    swapperName,
    toCrypto,
    toFiat,
    toggleIsExactAllowance,
    tradeExecutionStatus,
    translate,
  ])

  const slippageDecimalPercentage = useMemo(
    () => getDefaultSlippageDecimalPercentageForSwapper(swapperName),
    [swapperName],
  )

  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), 1)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(store.getState(), 1)

  const isBridge = buyAsset.chainId !== sellAsset.chainId
  const tradeType = isBridge ? TradeType.Bridge : TradeType.Swap

  return (
    <Hop
      steps={steps}
      activeStep={activeStep}
      slippageDecimalPercentage={slippageDecimalPercentage}
      networkFeeFiatPrecision={networkFeeFiatPrecision ?? '0'}
      protocolFeeFiatPrecision={protocolFeeFiatPrecision ?? '0'}
      hopIndex={1}
      title={`${tradeType} via ${swapperName}`}
      isOpen={isOpen}
      onToggleIsOpen={onToggleIsOpen}
    />
  )
}
