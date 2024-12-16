import { Skeleton, Stack } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import {
  selectHopNetworkFeeUserCurrency,
  selectIsActiveSwapperQuoteLoading,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { TradeStep } from './helpers'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useSignAllowanceApproval } from './hooks/useSignAllowanceApproval'
import { useTradeSteps } from './hooks/useTradeSteps'
import { TradeConfirmSummary } from './TradeConfirmFooterContent/TradeConfirmSummary'
import { TradeFooterButton } from './TradeFooterButton'

type TradeConfirmFooterProps = {
  tradeQuoteStep: TradeQuoteStep
  activeTradeId: string
}

export const TradeConfirmFooter: FC<TradeConfirmFooterProps> = ({
  tradeQuoteStep,
  activeTradeId,
}) => {
  const currentHopIndex = useCurrentHopIndex()
  const tradeNetworkFeeFiatUserCurrency = useSelectorWithArgs(selectHopNetworkFeeUserCurrency, {
    hopIndex: currentHopIndex,
  })
  const isActiveSwapperQuoteLoading = useAppSelector(selectIsActiveSwapperQuoteLoading)
  const sellChainFeeAsset = useSelectorWithArgs(
    selectFeeAssetById,
    tradeQuoteStep.sellAsset.assetId,
  )
  const buyChainFeeAsset = useSelectorWithArgs(selectFeeAssetById, tradeQuoteStep.buyAsset.assetId)
  const sellChainFeeAssetUserCurrencyRate = useSelectorWithArgs(
    selectMarketDataByAssetIdUserCurrency,
    sellChainFeeAsset?.assetId ?? '',
  )

  const {
    allowanceResetNetworkFeeCryptoBaseUnit,
    approvalNetworkFeeCryptoBaseUnit,
    isAllowanceResetLoading,
    isAllowanceApprovalLoading,
  } = useSignAllowanceApproval({
    tradeQuoteStep,
    isExactAllowance: true,
    activeTradeId,
  }) // FIXME: handle allowance selection

  const allowanceResetNetworkFeeCryptoHuman = fromBaseUnit(
    allowanceResetNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const allowanceResetNetworkFeeUserCurrency = bnOrZero(allowanceResetNetworkFeeCryptoHuman)
    .times(sellChainFeeAssetUserCurrencyRate.price)
    .toString()

  const approvalNetworkFeeCryptoHuman = fromBaseUnit(
    approvalNetworkFeeCryptoBaseUnit,
    buyChainFeeAsset?.precision ?? 0,
  )

  const approvalNetworkFeeUserCurrency = bnOrZero(approvalNetworkFeeCryptoHuman)
    .times(sellChainFeeAssetUserCurrencyRate.price)
    .toString()

  const { currentTradeStep } = useTradeSteps()

  const tradeResetStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.allowanceResetFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceResetLoading}>
              <Amount.Fiat value={allowanceResetNetworkFeeUserCurrency} />
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [allowanceResetNetworkFeeUserCurrency, isAllowanceResetLoading])

  const tradeAllowanceStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.approvalFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceApprovalLoading}>
              <Amount.Fiat value={approvalNetworkFeeUserCurrency} />
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [approvalNetworkFeeUserCurrency, isAllowanceApprovalLoading])

  const tradeExecutionStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} width='full'>
        <Row>
          <Row.Label>
            <Text translation='trade.transactionFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isActiveSwapperQuoteLoading}>
              <Amount.Fiat value={tradeNetworkFeeFiatUserCurrency} />
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [tradeNetworkFeeFiatUserCurrency, isActiveSwapperQuoteLoading])

  const TradeDetail = useMemo(() => {
    switch (currentTradeStep) {
      // No trade step is active, quote is still to be confirmed
      case undefined:
        return <TradeConfirmSummary />
      case TradeStep.FirstHopReset:
      case TradeStep.LastHopReset:
        return tradeResetStepSummary
      case TradeStep.FirstHopApproval:
      case TradeStep.LastHopApproval:
        return tradeAllowanceStepSummary
      case TradeStep.FirstHopSwap:
      case TradeStep.LastHopSwap:
        return tradeExecutionStepSummary
      default:
        return null
    }
  }, [
    currentTradeStep,
    tradeResetStepSummary,
    tradeAllowanceStepSummary,
    tradeExecutionStepSummary,
  ])

  const FooterButton = useMemo(() => {
    if (!tradeQuoteStep || currentHopIndex === undefined || !activeTradeId) return null
    return (
      <TradeFooterButton
        tradeQuoteStep={tradeQuoteStep}
        currentHopIndex={currentHopIndex}
        activeTradeId={activeTradeId}
      />
    )
  }, [tradeQuoteStep, currentHopIndex, activeTradeId])

  return <SharedConfirmFooter detail={TradeDetail} button={FooterButton} />
}
