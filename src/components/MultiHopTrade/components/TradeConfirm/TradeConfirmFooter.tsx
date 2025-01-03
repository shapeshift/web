import { HStack, Skeleton, Stack, Switch } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
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
  const [hasClickedButton, setHasClickedButton] = useState(false)
  const currentHopIndex = useCurrentHopIndex()
  const networkFeeCryptoBaseUnit = tradeQuoteStep.feeData.networkFeeCryptoBaseUnit
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, tradeQuoteStep.sellAsset.assetId)
  const networkFeeCryptoPrecision = fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset?.precision ?? 0)
  const feeAssetUserCurrencyRate = useSelectorWithArgs(
    selectMarketDataByAssetIdUserCurrency,
    feeAsset?.assetId ?? '',
  )
  const networkFeeUserCurrency = bnOrZero(networkFeeCryptoPrecision)
    .times(feeAssetUserCurrencyRate.price)
    .toFixed()
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

  const { currentTradeStep } = useStepperSteps()

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

  const isApprovalButtonDisabled = useMemo(() => {
    return isAllowanceApprovalLoading || hasClickedButton
  }, [isAllowanceApprovalLoading, hasClickedButton])

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
                disabled={isApprovalButtonDisabled}
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
    isApprovalButtonDisabled,
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
            <Skeleton isLoaded={!isActiveSwapperQuoteLoading}>
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
        hasClickedButton={hasClickedButton}
        setHasClickedButton={setHasClickedButton}
      />
    )
  }, [
    tradeQuoteStep,
    currentHopIndex,
    activeTradeId,
    isExactAllowance,
    hasClickedButton,
    setHasClickedButton,
  ])

  return <SharedConfirmFooter detail={tradeDetail} button={footerButton} />
}
