import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Icon,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { FaRotateRight } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SharedApprovalStep } from './SharedApprovalStep/SharedApprovalStep'
import type { RenderAllowanceContentCallbackParams } from './SharedApprovalStep/types'
import { StatusIcon } from './StatusIcon'

export type ApprovalResetStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
}

const defaultIcon = <FaRotateRight />

export const ApprovalResetStep = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLoading,
  activeTradeId,
}: ApprovalResetStepProps) => {
  const translate = useTranslate()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])
  const { state: hopExecutionState, allowanceReset } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const stepIndicator = useMemo(() => {
    const txStatus = (() => {
      switch (hopExecutionState) {
        case HopExecutionState.Pending:
          return TransactionExecutionState.AwaitingConfirmation
        case HopExecutionState.AwaitingApprovalReset:
          return allowanceReset.state === TransactionExecutionState.Failed
            ? TransactionExecutionState.Failed
            : TransactionExecutionState.Pending
        case HopExecutionState.AwaitingApproval:
        case HopExecutionState.AwaitingPermit2:
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return TransactionExecutionState.Complete
        default:
          assertUnreachable(hopExecutionState)
      }
    })()

    return <StatusIcon txStatus={txStatus} defaultIcon={defaultIcon} />
  }, [allowanceReset.state, hopExecutionState])

  const renderResetAllowanceContent = useCallback(
    ({
      transactionExecutionState,
      isAllowanceApprovalLoading,
      handleSignAllowanceApproval,
    }: RenderAllowanceContentCallbackParams) => {
      // only render the approval button when the component is active and we don't yet have a tx hash
      if (!isActive) return

      return (
        <Card p='2' width='full'>
          <VStack width='full'>
            <Row px={2}>
              <Row.Label display='flex' alignItems='center'>
                <Text color='text.subtle' translation='trade.resetAllowance' />
                <Tooltip label={translate('trade.resetAllowanceTooltip')}>
                  <Box ml={1}>
                    <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                  </Box>
                </Tooltip>
              </Row.Label>
            </Row>
            <Button
              width='full'
              size='sm'
              colorScheme='blue'
              isDisabled={
                isAllowanceApprovalLoading ||
                transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation
              }
              isLoading={isAllowanceApprovalLoading}
              onClick={handleSignAllowanceApproval}
            >
              {transactionExecutionState === TransactionExecutionState.Pending && (
                <CircularProgress isIndeterminate size={2} mr={2} />
              )}
              {translate('common.reset')}
            </Button>
            <Divider />
          </VStack>
        </Card>
      )
    },
    [translate, isActive],
  )

  const isComplete = useMemo(() => {
    return [
      HopExecutionState.AwaitingApproval,
      HopExecutionState.AwaitingPermit2,
      HopExecutionState.AwaitingSwap,
      HopExecutionState.Complete,
    ].includes(hopExecutionState)
  }, [hopExecutionState])

  return (
    <SharedApprovalStep
      isComplete={isComplete}
      tradeQuoteStep={tradeQuoteStep}
      txHash={allowanceReset.txHash}
      hopIndex={hopIndex}
      isLoading={isLoading}
      activeTradeId={activeTradeId}
      hopExecutionState={hopExecutionState}
      transactionExecutionState={allowanceReset.state}
      titleTranslation='trade.resetTitle'
      stepIndicator={stepIndicator}
      errorTranslation='trade.approvalResetFailed'
      gasFeeLoadingTranslation='trade.approvalResetGasFeeLoading'
      gasFeeTranslation='trade.approvalResetGasFee'
      renderContent={renderResetAllowanceContent}
      allowanceType={AllowanceType.Reset}
    />
  )
}
