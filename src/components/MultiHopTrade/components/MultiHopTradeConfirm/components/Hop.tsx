import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Card,
  CardFooter,
  Circle,
  Collapse,
  Divider,
  Flex,
  HStack,
  Stepper,
  useColorModeValue,
} from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import prettyMilliseconds from 'pretty-ms'
import { useMemo, useState } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { ProtocolIcon } from 'components/Icons/Protocol'
import { SlippageIcon } from 'components/Icons/Slippage'
import { RawText } from 'components/Text'
import type { SwapperName, TradeQuoteStep } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'
import {
  selectHopTotalNetworkFeeFiatPrecision,
  selectHopTotalProtocolFeesFiatPrecision,
  selectInitialApprovalRequirements,
  selectIsActiveQuoteMultiHop,
  selectTradeExecutionState,
} from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { TradeType } from '../types'
import { getHopExecutionState } from '../utils/getHopExecutionState'
import { ApprovalStep } from './ApprovalStep'
import { AssetSummaryStep } from './AssetSummaryStep'
import { DonationStep } from './DonationStep'
import { HopTransactionStep } from './HopTransactionStep'
import { TimeRemaining } from './TimeRemaining'
import { TwirlyToggle } from './TwirlyToggle'

const collapseWidth = { width: '100%' }

export const Hop = ({
  swapperName,
  tradeQuoteStep,
  hopIndex,
  isOpen,
  onToggleIsOpen,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isOpen: boolean
  onToggleIsOpen?: () => void
}) => {
  const borderColor = useColorModeValue('gray.50', 'gray.650')
  const networkFeeFiatPrecision = useAppSelector(state =>
    selectHopTotalNetworkFeeFiatPrecision(state, hopIndex),
  )
  const protocolFeeFiatPrecision = useAppSelector(state =>
    selectHopTotalProtocolFeesFiatPrecision(state, hopIndex),
  )
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const tradeExecutionState = useAppSelector(selectTradeExecutionState)
  const hopExecutionState = useMemo(() => {
    return getHopExecutionState(tradeExecutionState, hopIndex)
  }, [hopIndex, tradeExecutionState])

  const [txStatus, setTxStatus] = useState<TxStatus | undefined>()

  const rightComponent = useMemo(() => {
    switch (txStatus) {
      case undefined:
      case TxStatus.Unknown:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <RawText fontWeight='bold'>
              {prettyMilliseconds(tradeQuoteStep.estimatedExecutionTimeMs)}
            </RawText>
          )
        )
      case TxStatus.Pending:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <TimeRemaining initialTimeMs={tradeQuoteStep.estimatedExecutionTimeMs} />
          )
        )
      case TxStatus.Confirmed:
        return onToggleIsOpen ? (
          <TwirlyToggle isOpen={isOpen} onToggle={onToggleIsOpen} p={4} />
        ) : null
      default:
        return null
    }
  }, [tradeQuoteStep.estimatedExecutionTimeMs, isOpen, onToggleIsOpen, txStatus])

  const initialApprovalRequirements = useAppSelector(selectInitialApprovalRequirements)
  const isApprovalInitiallyNeeded = initialApprovalRequirements?.[hopIndex]

  const activeStep = useMemo(() => {
    switch (hopExecutionState) {
      case HopExecutionState.Pending:
        return -Infinity
      case HopExecutionState.AwaitingApprovalConfirmation:
      case HopExecutionState.AwaitingApprovalExecution:
        return hopIndex === 0 ? 1 : 0
      case HopExecutionState.AwaitingTradeConfirmation:
      case HopExecutionState.AwaitingTradeExecution:
        if (isApprovalInitiallyNeeded) {
          return hopIndex === 0 ? 2 : 1
        } else {
          return hopIndex === 0 ? 1 : 0
        }
      case HopExecutionState.Complete:
        return Infinity
      default:
        assertUnreachable(hopExecutionState)
    }
  }, [hopExecutionState, hopIndex, isApprovalInitiallyNeeded])

  const slippageDecimalPercentage = useMemo(
    () => getDefaultSlippageDecimalPercentageForSwapper(swapperName),
    [swapperName],
  )

  const title = useMemo(() => {
    const isBridge = tradeQuoteStep.buyAsset.chainId !== tradeQuoteStep.sellAsset.chainId
    const tradeType = isBridge ? TradeType.Bridge : TradeType.Swap
    return `${tradeType} via ${swapperName}`
  }, [swapperName, tradeQuoteStep.buyAsset.chainId, tradeQuoteStep.sellAsset.chainId])

  const shouldRenderFinalSteps = !isMultiHopTrade || hopIndex === 1

  return (
    <Card flex={1} bg='transparent' borderWidth={0} borderRadius={0} width='full' boxShadow='none'>
      <HStack width='full' justifyContent='space-between' px={6} marginTop={4}>
        <HStack>
          {hopExecutionState === HopExecutionState.Complete ? (
            <Circle size={8} bg='background.success'>
              <CheckCircleIcon color='text.success' />
            </Circle>
          ) : (
            <Circle size={8} borderColor={borderColor} borderWidth={2}>
              <RawText as='b'>{hopIndex + 1}</RawText>
            </Circle>
          )}
          <RawText as='b'>{title}</RawText>
        </HStack>
        {rightComponent}∂
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
            <ApprovalStep
              tradeQuoteStep={tradeQuoteStep}
              hopExecutionState={hopExecutionState}
              isActive={[
                HopExecutionState.AwaitingApprovalConfirmation,
                HopExecutionState.AwaitingApprovalExecution,
              ].includes(hopExecutionState)}
            />
          </Collapse>
          <HopTransactionStep
            swapperName={swapperName}
            tradeQuoteStep={tradeQuoteStep}
            isActive={[
              HopExecutionState.AwaitingTradeConfirmation,
              HopExecutionState.AwaitingTradeExecution,
            ].includes(hopExecutionState)}
            hopExecutionState={hopExecutionState}
            onTxStatusChange={setTxStatus}
            isLastStep={!shouldRenderFinalSteps}
          />
          {shouldRenderFinalSteps && <DonationStep />}
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
      <CardFooter fontSize='sm'>
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
            {/* Placeholder - use correct icon here */}
            <Flex color='text.subtle'>
              <ProtocolIcon />
            </Flex>
            <Amount.Fiat value={protocolFeeFiatPrecision ?? '0'} display='inline' />
          </Flex>

          <Flex alignItems='center' gap={2}>
            {/* Placeholder - use correct icon here */}
            <Flex color='text.subtle'>
              <SlippageIcon />
            </Flex>
            <Amount.Percent value={slippageDecimalPercentage} display='inline' />
          </Flex>
        </HStack>
      </CardFooter>
    </Card>
  )
}
