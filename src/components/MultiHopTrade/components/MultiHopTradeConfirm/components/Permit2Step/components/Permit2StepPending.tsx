import { Button, Card, CircularProgress, VStack } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

import { StepperStep } from '../../StepperStep'

export type Permit2StepPendingProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isLoading?: boolean
  activeTradeId: string
  hopExecutionState: HopExecutionState
  transactionExecutionState: TransactionExecutionState
  stepIndicator: JSX.Element
}

export const Permit2StepPending = ({
  tradeQuoteStep,
  hopIndex,
  isLoading,
  activeTradeId,
  stepIndicator,
  hopExecutionState,
  transactionExecutionState,
}: Permit2StepPendingProps) => {
  const translate = useTranslate()

  const isPermit2MutationLoading = false
  // const { permit2Mutation, isLoading: isPermit2MutationLoading } = usePermit2Mutation(
  //   tradeQuoteStep,
  //   hopIndex,
  //   allowanceType,
  //   true,
  //   activeTradeId,
  // )

  const handleSignPermit2Message = useCallback(() => {
    try {
      // TODO:
      // await permit2Mutation.mutateAsync()
    } catch (error) {
      console.error(error)
    }
  }, [])

  const content = useMemo(() => {
    const isAwaitingPermit2 = hopExecutionState === HopExecutionState.AwaitingPermit2

    // only render the permit2 button when the component is active
    if (!isAwaitingPermit2) return

    const isDisabled =
      isPermit2MutationLoading ||
      !isAwaitingPermit2 ||
      transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation

    return (
      <Card p='2' width='full'>
        <VStack width='full'>
          <Button
            width='full'
            size='sm'
            colorScheme='blue'
            isDisabled={isDisabled}
            isLoading={isPermit2MutationLoading}
            onClick={handleSignPermit2Message}
          >
            {transactionExecutionState !== TransactionExecutionState.AwaitingConfirmation && (
              <CircularProgress isIndeterminate size={2} mr={2} />
            )}
            {translate('trade.permit2.signMessage')}
          </Button>
        </VStack>
      </Card>
    )
  }, [
    handleSignPermit2Message,
    hopExecutionState,
    isPermit2MutationLoading,
    transactionExecutionState,
    translate,
  ])

  return (
    <StepperStep
      title={translate('trade.permit2.title')}
      description={translate('trade.permit2.description', {
        symbol: tradeQuoteStep.sellAsset.symbol,
      })}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={false}
      isLoading={isLoading}
      isError={transactionExecutionState === TransactionExecutionState.Failed}
      isPending={transactionExecutionState === TransactionExecutionState.Pending}
    />
  )
}
