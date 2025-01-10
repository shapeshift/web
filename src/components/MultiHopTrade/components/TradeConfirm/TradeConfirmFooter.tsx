import { HStack, Skeleton, Stack, Switch } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text/Text'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectIsActiveSwapperQuoteLoading } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { isPermit2Hop } from '../MultiHopTradeConfirm/hooks/helpers'
import { useTradeNetworkFeeCryptoBaseUnit } from '../MultiHopTradeConfirm/hooks/useTradeNetworkFeeCryptoBaseUnit'
import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { StepperStep } from './helpers'
import { useActiveTradeAllowance } from './hooks/useActiveTradeAllowance'
import { useCurrentHopIndex } from './hooks/useCurrentHopIndex'
import { useStepperSteps } from './hooks/useStepperSteps'
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

  const {
    isLoading: isNetworkFeeCryptoBaseUnitLoading,
    isRefetching: isNetworkFeeCryptoBaseUnitRefetching,
    data: networkFeeCryptoBaseUnit,
  } = useTradeNetworkFeeCryptoBaseUnit({
    hopIndex: currentHopIndex,
    enabled:
      currentTradeStep === StepperStep.FirstHopSwap || currentTradeStep === StepperStep.LastHopSwap,
  })

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!networkFeeCryptoBaseUnit) return quoteNetworkFeeCryptoPrecision

    return fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset?.precision ?? 0)
  }, [networkFeeCryptoBaseUnit, feeAsset?.precision, quoteNetworkFeeCryptoPrecision])

  const networkFeeUserCurrency = useMemo(() => {
    return bnOrZero(networkFeeCryptoPrecision).times(feeAssetUserCurrencyRate.price).toFixed()
  }, [networkFeeCryptoPrecision, feeAssetUserCurrencyRate.price])

  const allowanceResetNetworkFeeCryptoPrecision = fromBaseUnit(
    allowanceResetNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const allowanceResetNetworkFeeUserCurrency = bnOrZero(allowanceResetNetworkFeeCryptoPrecision)
    .times(feeAssetUserCurrencyRate.price)
    .toFixed()

  const approvalNetworkFeeCryptoPrecision = fromBaseUnit(
    approvalNetworkFeeCryptoBaseUnit,
    sellChainFeeAsset?.precision ?? 0,
  )

  const approvalNetworkFeeUserCurrency = bnOrZero(approvalNetworkFeeCryptoPrecision)
    .times(feeAssetUserCurrencyRate.price)
    .toFixed()

  const tradeResetStepSummary = useMemo(() => {
    return (
      <Stack spacing={4} width='full'>
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
      <Stack spacing={4} width='full'>
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
      <Stack spacing={4} width='full'>
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
      </Stack>
    )
  }, [
    feeAsset?.symbol,
    isActiveSwapperQuoteLoading,
    isNetworkFeeCryptoBaseUnitLoading,
    isNetworkFeeCryptoBaseUnitRefetching,
    networkFeeCryptoPrecision,
    networkFeeUserCurrency,
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

  return <SharedConfirmFooter detail={tradeDetail} button={footerButton} />
}
