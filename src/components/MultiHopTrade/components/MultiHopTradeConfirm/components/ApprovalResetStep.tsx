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
import { useCallback, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { FaRotateRight } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { SharedApprovalStep } from './SharedApprovalStep/SharedApprovalStep'
import type { RenderAllowanceContentCallbackParams } from './SharedApprovalStep/types'
import { ApprovalStatusIcon } from './StatusIcon'

export type ApprovalResetStepProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
}

const initialIcon = <FaRotateRight />

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
  const { state, allowanceReset } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const stepIndicator = useMemo(() => {
    return (
      <ApprovalStatusIcon
        hopExecutionState={state}
        approvalTxState={allowanceReset.state}
        initialIcon={initialIcon}
      />
    )
  }, [allowanceReset.state, state])

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

  return (
    <SharedApprovalStep
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isLoading={isLoading}
      activeTradeId={activeTradeId}
      hopExecutionState={state}
      transactionExecutionState={allowanceReset.state}
      titleTranslation='trade.resetTitle'
      stepIndicator={stepIndicator}
      errorTranslation='trade.approvalResetFailed'
      gasFeeLoadingTranslation='trade.approvalResetGasFeeLoading'
      gasFeeTranslation='trade.approvalResetGasFee'
      renderContent={renderResetAllowanceContent}
      allowanceType={AllowanceType.Reset}
      feeQueryEnabled={false}
    />
  )
}
