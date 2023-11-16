import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Box,
  Card,
  CardFooter,
  Circle,
  Collapse,
  Divider,
  Flex,
  HStack,
  IconButton,
  Stepper,
  useColorModeValue,
} from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import prettyMilliseconds from 'pretty-ms'
import { useMemo, useState } from 'react'
import { FaAdjust, FaGasPump, FaProcedures } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
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
import { store, useAppSelector } from 'state/store'

import { TradeType } from '../types'
import { getHopExecutionState } from '../utils/getHopExecutionState'
import { ApprovalStep } from './ApprovalStep'
import { AssetSummaryStep } from './AssetSummaryStep'
import { DonationStep } from './DonationStep'
import { HopTransactionStep } from './HopTransactionStep'
import { JuicyGreenCheck } from './JuicyGreenCheck'
import { TimeRemaining } from './TimeRemaining'

const cardBorderRadius = { base: 'xl' }

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
  onToggleIsOpen: () => void
}) => {
  const translate = useTranslate()
  const backgroundColor = useColorModeValue('gray.100', 'gray.750')
  const borderColor = useColorModeValue('gray.50', 'gray.650')
  const chevronUpIcon = useMemo(() => <ChevronUpIcon boxSize='16px' />, [])
  const chevronDownIcon = useMemo(() => <ChevronDownIcon boxSize='16px' />, [])
  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), hopIndex)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(
    store.getState(),
    hopIndex,
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
            <RawText>{prettyMilliseconds(tradeQuoteStep.estimatedExecutionTimeMs)}</RawText>
          )
        )
      case TxStatus.Pending:
        return (
          tradeQuoteStep.estimatedExecutionTimeMs !== undefined && (
            <TimeRemaining initialTimeMs={tradeQuoteStep.estimatedExecutionTimeMs} />
          )
        )
      case TxStatus.Confirmed:
        return (
          <Box width='auto'>
            <IconButton
              aria-label={translate('trade.expand')}
              variant='link'
              p={4}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={onToggleIsOpen}
              width='full'
              icon={isOpen ? chevronUpIcon : chevronDownIcon}
            />
          </Box>
        )
      default:
        return null
    }
  }, [
    chevronDownIcon,
    chevronUpIcon,
    tradeQuoteStep.estimatedExecutionTimeMs,
    isOpen,
    onToggleIsOpen,
    translate,
    txStatus,
  ])

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
    <Card
      flex={1}
      borderRadius={cardBorderRadius}
      width='full'
      backgroundColor={backgroundColor}
      borderColor={borderColor}
    >
      <HStack width='full' justifyContent='space-between' paddingLeft={6} marginTop={4}>
        <HStack>
          {hopExecutionState === HopExecutionState.Complete ? (
            <JuicyGreenCheck />
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
          <Collapse in={isApprovalInitiallyNeeded}>
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
      <Divider />
      <CardFooter>
        <HStack width='full' justifyContent='space-between'>
          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center'>
            <Box marginRight={2} color='text.subtle'>
              <FaGasPump />
            </Box>
            <Amount.Fiat value={networkFeeFiatPrecision ?? '0'} display='inline' />
          </Flex>

          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center'>
            {/* Placeholder - use correct icon here */}
            <Box marginRight={2} color='text.subtle'>
              <FaProcedures />
            </Box>
            <Amount.Fiat value={protocolFeeFiatPrecision ?? '0'} display='inline' />
          </Flex>

          <Flex alignItems='center'>
            {/* Placeholder - use correct icon here */}
            <Box marginRight={2} color='text.subtle'>
              <FaAdjust />
            </Box>
            <Amount.Percent value={slippageDecimalPercentage} display='inline' />
          </Flex>
        </HStack>
      </CardFooter>
    </Card>
  )
}
