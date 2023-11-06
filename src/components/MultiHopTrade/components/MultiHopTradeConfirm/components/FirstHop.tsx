import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useAllowanceApproval } from 'components/MultiHopTrade/hooks/useAllowanceApproval/useAllowanceApproval'
import { useTradeExecution } from 'components/MultiHopTrade/hooks/useTradeExecution/useTradeExecution'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
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
  selectQuoteDonationAmountUsd,
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
  getTitleStep,
  getTradeStep,
} from './steps'

export const FirstHop = ({
  swapperName,
  tradeQuoteStep,
  isMultiHopTrade,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  isMultiHopTrade: boolean
}) => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)
  const donationAmountUsd = useAppSelector(selectQuoteDonationAmountUsd)
  const {
    // TODO: use these
    // executeTrade,
    // buyTxHash,
    // message,
    sellTxHash,
    tradeStatus,
  } = useTradeExecution()

  // TODO: use `isApprovalNeeded === undefined` here to display placeholder loading during initial approval check
  const {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
  } = useAllowanceApproval(tradeQuoteStep, isExactAllowance)

  const shouldRenderDonation = bnOrZero(donationAmountUsd).gt(0)
  const { onRejectApproval, onSignTrade, onRejectTrade } = useTradeExecutooor()

  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const fiatPriceByAssetId = useAppSelector(selectCryptoMarketData)

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
      case MultiHopExecutionStatus.Previewing:
        return -Infinity
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
        return 3
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return isApprovalNeeded ? 4 : 3
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalNeeded])

  const steps = useMemo(() => {
    const {
      buyAsset,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuoteStep
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

    const sellAssetFiatRate = fiatPriceByAssetId[sellAsset.assetId]?.price ?? '0'
    const sellAmountFiatFormatted = toFiat(
      bn(sellAmountCryptoPrecision).times(sellAssetFiatRate).toString(),
    )

    const isBridge = buyAsset.chainId !== sellAsset.chainId
    const tradeType = isBridge ? TradeType.Bridge : TradeType.Swap
    const hopSteps = [
      getTitleStep({
        hopIndex: 0,
        isHopComplete:
          tradeExecutionStatus === MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation,
        swapperName,
        tradeType,
      }),
      getAssetSummaryStep({
        amountCryptoFormatted: sellAmountCryptoFormatted,
        amountFiatFormatted: sellAmountFiatFormatted,
        asset: sellAsset,
      }),
      getHopSummaryStep({
        swapperName,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted,
        sellAmountCryptoFormatted,
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
          onReject: onRejectApproval,
        }),
      )
    }

    hopSteps.push(
      getTradeStep({
        txHash: sellTxHash,
        txStatus: tradeStatus,
        onSign: onSignTrade,
        onReject: onRejectTrade,
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
          asset: buyAsset,
        }),
      )
    }

    return hopSteps
  }, [
    approvalNetworkFeeCryptoBaseUnit,
    approvalTxId,
    donationAmountUsd,
    executeAllowanceApproval,
    fiatPriceByAssetId,
    isApprovalNeeded,
    isExactAllowance,
    isMultiHopTrade,
    onRejectApproval,
    onRejectTrade,
    onSignTrade,
    sellTxHash,
    shouldRenderDonation,
    swapperName,
    toCrypto,
    toFiat,
    toggleIsExactAllowance,
    tradeExecutionStatus,
    tradeQuoteStep,
    tradeStatus,
    translate,
  ])

  const slippageDecimalPercentage = useMemo(
    () => getDefaultSlippageDecimalPercentageForSwapper(swapperName),
    [swapperName],
  )

  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), 0)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(store.getState(), 0)

  return (
    <Hop
      steps={steps}
      activeStep={activeStep}
      slippageDecimalPercentage={slippageDecimalPercentage}
      networkFeeFiatPrecision={networkFeeFiatPrecision ?? '0'}
      protocolFeeFiatPrecision={protocolFeeFiatPrecision ?? '0'}
    />
  )
}
