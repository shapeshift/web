import {
  Box,
  Button,
  Card,
  CircularProgress,
  Icon,
  Switch,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { FaThumbsUp } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { useToggle } from 'hooks/useToggle/useToggle'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SharedApprovalStep } from './SharedApprovalStep/SharedApprovalStep'
import type { RenderAllowanceContentCallbackParams } from './SharedApprovalStep/types'
import { StatusIcon } from './StatusIcon'

export type ApprovalStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
}

const defaultIcon = <FaThumbsUp />

export const ApprovalStep = ({
  tradeQuoteStep,
  hopIndex,
  isActive,
  isLoading,
  activeTradeId,
}: ApprovalStepProps) => {
  const translate = useTranslate()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(true)

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])
  const { state: hopExecutionState, approval } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const stepIndicator = useMemo(() => {
    const txStatus = (() => {
      switch (hopExecutionState) {
        case HopExecutionState.Pending:
        case HopExecutionState.AwaitingApprovalReset:
          return TransactionExecutionState.AwaitingConfirmation
        case HopExecutionState.AwaitingApproval:
          return approval.state === TransactionExecutionState.Failed
            ? TransactionExecutionState.Failed
            : TransactionExecutionState.Pending
        case HopExecutionState.AwaitingPermit2:
        case HopExecutionState.AwaitingSwap:
        case HopExecutionState.Complete:
          return TransactionExecutionState.Complete
        default:
          assertUnreachable(hopExecutionState)
      }
    })()

    return <StatusIcon txStatus={txStatus} defaultIcon={defaultIcon} />
  }, [approval.state, hopExecutionState])

  const renderApprovalContent = useCallback(
    ({
      hopExecutionState,
      transactionExecutionState,
      isAllowanceApprovalLoading,
      handleSignAllowanceApproval,
    }: RenderAllowanceContentCallbackParams) => {
      // only render the approval button when the component is active and we don't yet have a tx hash
      if (!isActive) return

      const isAwaitingApproval = hopExecutionState === HopExecutionState.AwaitingApproval
      const isDisabled =
        isAllowanceApprovalLoading ||
        !isAwaitingApproval ||
        transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation

      return (
        <Card p='2' width='full'>
          <VStack width='full'>
            <Row px={2}>
              <Row.Label display='flex' alignItems='center'>
                <Text color='text.subtle' translation='trade.allowance' />
                <Tooltip label={translate('trade.allowanceTooltip')}>
                  <Box ml={1}>
                    <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                  </Box>
                </Tooltip>
              </Row.Label>
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
                  disabled={isDisabled}
                  onChange={toggleIsExactAllowance}
                />
                <Text
                  color={isExactAllowance ? 'white' : 'text.subtle'}
                  translation='trade.exact'
                  fontWeight='bold'
                />
              </Row.Value>
            </Row>
            <Button
              width='full'
              size='sm'
              colorScheme='blue'
              isDisabled={isDisabled}
              isLoading={isAllowanceApprovalLoading}
              onClick={handleSignAllowanceApproval}
            >
              {transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation && (
                <CircularProgress isIndeterminate size={2} mr={2} />
              )}
              {translate('common.approve')}
            </Button>
          </VStack>
        </Card>
      )
    },
    [isActive, translate, isExactAllowance, toggleIsExactAllowance],
  )

  const isComplete = useMemo(() => {
    return [
      HopExecutionState.AwaitingPermit2,
      HopExecutionState.AwaitingSwap,
      HopExecutionState.Complete,
    ].includes(hopExecutionState)
  }, [hopExecutionState])

  return (
    <SharedApprovalStep
      isComplete={isComplete}
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isLoading={isLoading}
      activeTradeId={activeTradeId}
      hopExecutionState={hopExecutionState}
      transactionExecutionState={approval.state}
      titleTranslation='trade.approvalTitle'
      errorTranslation='trade.approvalFailed'
      gasFeeLoadingTranslation='trade.approvalGasFeeLoading'
      gasFeeTranslation='trade.approvalGasFee'
      stepIndicator={stepIndicator}
      renderContent={renderApprovalContent}
      txHash={approval.txHash}
      allowanceType={isExactAllowance ? AllowanceType.Exact : AllowanceType.Unlimited}
    />
  )
}
