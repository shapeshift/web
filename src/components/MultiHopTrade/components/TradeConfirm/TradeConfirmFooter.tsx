import { HStack, Skeleton, Stack, Switch } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { TransactionExecutionState } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo } from 'react'

import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { TradeConfirmSummary } from './components/TradeConfirmSummary'
import { isPermit2Hop, StepperStep } from './helpers'
import { useActiveTradeAllowance } from './hooks/useActiveTradeAllowance'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useStepperSteps } from './hooks/useStepperSteps'
import { useTradeNetworkFeeCryptoBaseUnit } from './hooks/useTradeNetworkFeeCryptoBaseUnit'
import { TradeFooterButton } from './TradeFooterButton'

import { Amount } from '@/components/Amount/Amount'
import { RecipientAddressRow } from '@/components/RecipientAddressRow'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { selectFeeAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { selectInputBuyAsset } from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectHopChangeAddress,
  selectHopExecutionMetadata,
  selectIsActiveSwapperQuoteLoading,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

type TradeConfirmFooterProps = {
  tradeQuoteStep: TradeQuoteStep
  activeTradeId: string
  isCompact: boolean | undefined
}

export const TradeConfirmFooter: FC<TradeConfirmFooterProps> = ({
  tradeQuoteStep,
  activeTradeId,
}) => {
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(true)
  const { currentTradeStep } = useStepperSteps()
  const currentHopIndex = useCurrentHopIndex()
  const quoteNetworkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, tradeQuoteStep.sellAsset.assetId)
  const quoteNetworkFeeCryptoPrecision = fromBaseUnit(
    quoteNetworkFeeCryptoBaseUnit,
    feeAsset?.precision ?? 0,
  )
  const feeAssetUserCurrencyRate = useSelectorWithArgs(
    selectMarketDataByAssetIdUserCurrency,
    feeAsset?.assetId ?? '',
  )
  const isActiveSwapperQuoteLoading = useAppSelector(selectIsActiveSwapperQuoteLoading)
  const sellChainFeeAsset = useSelectorWithArgs(
    selectFeeAssetById,
    tradeQuoteStep.sellAsset.assetId,
  )

  const {
    allowanceResetNetworkFeeCryptoBaseUnit,
    approvalNetworkFeeCryptoBaseUnit,
    isAllowanceResetLoading,
    isAllowanceApprovalLoading,
  } = useActiveTradeAllowance({
    tradeQuoteStep,
    isExactAllowance,
    activeTradeId,
  })
  const activeQuote = useAppSelector(selectActiveQuote)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const receiveAddress = activeQuote?.receiveAddress

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!activeTradeId) return undefined

    return {
      tradeId: activeTradeId,
      hopIndex: currentHopIndex,
    }
  }, [activeTradeId, currentHopIndex])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const changeAddress = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopChangeAddress(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const {
    isLoading: isNetworkFeeCryptoBaseUnitLoading,
    isRefetching: isNetworkFeeCryptoBaseUnitRefetching,
    data: networkFeeCryptoBaseUnit,
  } = useTradeNetworkFeeCryptoBaseUnit({
    hopIndex: currentHopIndex,
    enabled:
      (currentTradeStep === StepperStep.FirstHopSwap ||
        currentTradeStep === StepperStep.LastHopSwap) &&
      // Stop fetching once the Tx is executed for this step
      hopExecutionMetadata?.state === HopExecutionState.AwaitingSwap &&
      hopExecutionMetadata?.swap?.state === TransactionExecutionState.AwaitingConfirmation,
  })

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!networkFeeCryptoBaseUnit) return quoteNetworkFeeCryptoPrecision

    return fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset?.precision ?? 0)
  }, [networkFeeCryptoBaseUnit, feeAsset?.precision, quoteNetworkFeeCryptoPrecision])

  const networkFeeUserCurrency = useMemo(() => {
    return bnOrZero(networkFeeCryptoPrecision)
      .times(bnOrZero(feeAssetUserCurrencyRate?.price))
      .toFixed()
  }, [networkFeeCryptoPrecision, feeAssetUserCurrencyRate?.price])

  const allowanceResetNetworkFeeCryptoPrecision = fromBaseUnit(
    allowanceResetNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const allowanceResetNetworkFeeUserCurrency = bnOrZero(allowanceResetNetworkFeeCryptoPrecision)
    .times(bnOrZero(feeAssetUserCurrencyRate?.price))
    .toFixed()

  const approvalNetworkFeeCryptoPrecision = fromBaseUnit(
    approvalNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const approvalNetworkFeeUserCurrency = bnOrZero(approvalNetworkFeeCryptoPrecision)
    .times(bnOrZero(feeAssetUserCurrencyRate?.price))
    .toFixed()

  const tradeResetStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.allowanceResetFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceResetLoading}>
              <HStack justifyContent='flex-end'>
                <Amount.Crypto
                  symbol={sellChainFeeAsset?.symbol ?? ''}
                  value={allowanceResetNetworkFeeCryptoPrecision}
                />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={allowanceResetNetworkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    )
  }, [
    allowanceResetNetworkFeeCryptoPrecision,
    allowanceResetNetworkFeeUserCurrency,
    isAllowanceResetLoading,
    sellChainFeeAsset?.symbol,
  ])

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

  const tradeAllowanceStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <Row>
          <Row.Label>
            <Text translation='common.approvalFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isAllowanceApprovalLoading}>
              <HStack justifyContent='flex-end'>
                <Amount.Crypto
                  symbol={sellChainFeeAsset?.symbol ?? ''}
                  value={approvalNetworkFeeCryptoPrecision}
                />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={approvalNetworkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
        {/* Permit2 should always have unlimited allowance without ability to toggle */}
        {!isPermit2 && (
          <Row>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'text.subtle' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch
                size='sm'
                mx={2}
                isChecked={isExactAllowance}
                disabled={isAllowanceApprovalLoading}
                onChange={toggleIsExactAllowance}
              />
              <Text
                color={isExactAllowance ? 'white' : 'text.subtle'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
        )}
      </Stack>
    )
  }, [
    isAllowanceApprovalLoading,
    sellChainFeeAsset?.symbol,
    approvalNetworkFeeCryptoPrecision,
    approvalNetworkFeeUserCurrency,
    isPermit2,
    isExactAllowance,
    toggleIsExactAllowance,
  ])

  const tradeExecutionStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} px={6} width='full'>
        <Row>
          <Row.Label>
            <Text translation='trade.transactionFee' />
          </Row.Label>
          <Row.Value>
            <Skeleton
              isLoaded={
                !isActiveSwapperQuoteLoading &&
                !isNetworkFeeCryptoBaseUnitLoading &&
                !isNetworkFeeCryptoBaseUnitRefetching
              }
            >
              <HStack justifyContent='flex-end'>
                <Amount.Crypto symbol={feeAsset?.symbol ?? ''} value={networkFeeCryptoPrecision} />
                <Amount.Fiat
                  color={'text.subtle'}
                  prefix='('
                  suffix=')'
                  noSpace
                  value={networkFeeUserCurrency}
                />
              </HStack>
            </Skeleton>
          </Row.Value>
        </Row>
        <RecipientAddressRow
          explorerAddressLink={buyAsset.explorerAddressLink}
          recipientAddress={receiveAddress ?? ''}
        />
        {changeAddress && (
          <Row>
            <Row.Label>
              <Text translation='trade.changeAddress' />
            </Row.Label>
            <Row.Value>
              <TooltipWithTouch label={changeAddress}>
                <MiddleEllipsis value={changeAddress} />
              </TooltipWithTouch>
            </Row.Value>
          </Row>
        )}
      </Stack>
    )
  }, [
    buyAsset,
    feeAsset?.symbol,
    isActiveSwapperQuoteLoading,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
    networkFeeCryptoPrecision,
    networkFeeUserCurrency,
    receiveAddress,
    changeAddress,
  ])

  const tradeDetail = useMemo(() => {
    switch (currentTradeStep) {
      // No trade step is active, quote is still to be confirmed
      case undefined:
        return <TradeConfirmSummary />
      case StepperStep.FirstHopReset:
      case StepperStep.LastHopReset:
        return tradeResetStepSummary
      case StepperStep.FirstHopApproval:
      case StepperStep.LastHopApproval:
        return tradeAllowanceStepSummary
      case StepperStep.FirstHopSwap:
      case StepperStep.LastHopSwap:
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

  const sharedConfirmFooterPaddingTop = useMemo(() => {
    if (!currentTradeStep) {
      return 0
    }

    return 4
  }, [currentTradeStep])

  const footerButton = useMemo(() => {
    if (!tradeQuoteStep || currentHopIndex === undefined || !activeTradeId) return null
    return (
      <TradeFooterButton
        tradeQuoteStep={tradeQuoteStep}
        currentHopIndex={currentHopIndex}
        activeTradeId={activeTradeId}
        isExactAllowance={isExactAllowance}
        isLoading={isNetworkFeeCryptoBaseUnitLoading || isNetworkFeeCryptoBaseUnitRefetching}
      />
    )
  }, [
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
  ])

  return (
    <SharedConfirmFooter
      detail={tradeDetail}
      button={footerButton}
      pt={sharedConfirmFooterPaddingTop}
    />
  )
}
