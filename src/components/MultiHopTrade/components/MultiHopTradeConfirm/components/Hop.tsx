import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Card,
  CardFooter,
  Circle,
  Collapse,
  Divider,
  Flex,
  HStack,
  Stepper,
} from '@chakra-ui/react'
import type { SwapperName, TradeQuoteStep } from '@shapeshiftoss/swapper'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { ProtocolIcon } from 'components/Icons/Protocol'
import { SlippageIcon } from 'components/Icons/Slippage'
import { RawText } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import {
  selectHopExecutionMetadata,
  selectHopTotalNetworkFeeFiatPrecision,
  selectHopTotalProtocolFeesFiatPrecision,
  selectIsActiveQuoteMultiHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { ApprovalStep } from './ApprovalStep'
import { AssetSummaryStep } from './AssetSummaryStep'
import { FeeStep } from './FeeStep'
import { HopTransactionStep } from './HopTransactionStep'
import { TimeRemaining } from './TimeRemaining'
import { TwirlyToggle } from './TwirlyToggle'

const collapseWidth = { width: '100%' }

export const Hop = ({
  swapperName,
  tradeQuoteStep,
  hopIndex,
  isOpen,
  slippageTolerancePercentageDecimal,
  onToggleIsOpen,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isOpen: boolean
  slippageTolerancePercentageDecimal: string | undefined
  onToggleIsOpen?: () => void
}) => {
  const translate = useTranslate()
  const networkFeeFiatPrecision = useAppSelector(state =>
    selectHopTotalNetworkFeeFiatPrecision(state, hopIndex),
  )
  const protocolFeeFiatPrecision = useAppSelector(state =>
    selectHopTotalProtocolFeesFiatPrecision(state, hopIndex),
  )
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  const {
    state: hopExecutionState,
    approval: { state: approvalTxState, isRequired: isApprovalInitiallyNeeded },
    swap: { state: swapTxState },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  const isError = useMemo(
    () => [approvalTxState, swapTxState].includes(TransactionExecutionState.Failed),
    [approvalTxState, swapTxState],
  )

  const rightComponent = useMemo(() => {
    switch (swapTxState) {
      case TransactionExecutionState.AwaitingConfirmation:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <RawText fontWeight='bold'>
              {prettyMilliseconds(tradeQuoteStep.estimatedExecutionTimeMs)}
            </RawText>
          )
        )
      case TransactionExecutionState.Pending:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <TimeRemaining initialTimeMs={tradeQuoteStep.estimatedExecutionTimeMs} />
          )
        )
      case TransactionExecutionState.Complete:
        return onToggleIsOpen ? (
          <TwirlyToggle isOpen={isOpen} onToggle={onToggleIsOpen} p={4} />
        ) : null
      default:
        return null
    }
  }, [swapTxState, tradeQuoteStep.estimatedExecutionTimeMs, onToggleIsOpen, isOpen])

  const activeStep = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        return -Infinity
      case HopExecutionState.AwaitingApproval:
        return hopIndex === 0 ? 1 : 0
      case HopExecutionState.AwaitingSwap:
        return hopIndex === 0 ? 2 : 1
      case HopExecutionState.Complete:
        return Infinity
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [hopExecutionState, hopIndex])

  const title = useMemo(() => {
    const isBridge = tradeQuoteStep.buyAsset.chainId !== tradeQuoteStep.sellAsset.chainId

    return isBridge
      ? translate('trade.hopTitle.bridge', { swapperName })
      : translate('trade.hopTitle.swap', { swapperName })
  }, [swapperName, tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId, translate])

  const shouldRenderFinalSteps = !isMultiHopTrade || hopIndex === 1

  const stepIcon = useMemo(() => {
    if (isError) {
      return (
        <Circle size={8} bg='background.error'>
          <WarningIcon color='text.error' />
        </Circle>
      )
    }

    switch (hopExecutionState) {
      case HopExecutionState.Complete:
        return (
          <Circle size={8} bg='background.success'>
            <CheckCircleIcon color='text.success' />
          </Circle>
        )
      case HopExecutionState.AwaitingApproval:
      case HopExecutionState.AwaitingSwap:
        return (
          <Circle size={8} bg='background.surface.raised.base'>
            <CircularProgress size={4} />
          </Circle>
        )
      default:
        return (
          <Circle size={8} borderColor='border.base' borderWidth={2}>
            <RawText as='b'>{hopIndex + 1}</RawText>
          </Circle>
        )
    }
  }, [hopExecutionState, hopIndex, isError])

  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <HStack>
          {stepIcon}
          <RawText as='b'>{title}</RawText>
        </HStack>
        {rightComponent}
      </HStack>
      <Collapse in={isOpen}>
        <Stepper index={activeStep} orientation='vertical' gap='0' margin={6}>
          {hopIndex === 0 && (
            <AssetSummaryStep
              asset={tradeQuoteStep.sellAsset}
              amountCryptoBaseUnit={tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit}
            />
          )}
          <Collapse in={isApprovalInitiallyNeeded} style={collapseWidth}>
            {isApprovalInitiallyNeeded === true && (
              <ApprovalStep
                tradeQuoteStep={tradeQuoteStep}
                hopIndex={hopIndex}
                isActive={hopExecutionState === HopExecutionState.AwaitingApproval}
              />
            )}
          </Collapse>
          <HopTransactionStep
            swapperName={swapperName}
            tradeQuoteStep={tradeQuoteStep}
            isActive={hopExecutionState === HopExecutionState.AwaitingSwap}
            hopIndex={hopIndex}
            isLastStep={!shouldRenderFinalSteps}
          />
          {shouldRenderFinalSteps ? <FeeStep /> : null}
          {shouldRenderFinalSteps && (
            <AssetSummaryStep
              asset={tradeQuoteStep.buyAsset}
              amountCryptoBaseUnit={tradeQuoteStep.buyAmountBeforeFeesCryptoBaseUnit}
              isLastStep={shouldRenderFinalSteps}
            />
          )}
        </Stepper>
      </Collapse>
      <Divider width='auto' ml={6} borderColor='border.base' opacity={1} />
      <CardFooter fontSize='sm' pl={8}>
        <HStack width='full' justifyContent='space-between'>
          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center' gap={2}>
            <Flex color='text.subtle'>
              <FaGasPump />
            </Flex>
            <Amount.Fiat value={networkFeeFiatPrecision ?? '0'} display='inline' />
          </Flex>

          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center' gap={2}>
            <Flex color='text.subtle'>
              <ProtocolIcon />
            </Flex>
            <Amount.Fiat value={protocolFeeFiatPrecision ?? '0'} display='inline' />
          </Flex>

          {slippageTolerancePercentageDecimal !== undefined && (
            <Flex alignItems='center' gap={2}>
              <Flex color='text.subtle'>
                <SlippageIcon />
              </Flex>
              <Amount.Percent value={slippageTolerancePercentageDecimal} display='inline' />
            </Flex>
          )}
        </HStack>
      </CardFooter>
    </Card>
  )
}
