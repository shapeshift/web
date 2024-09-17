import { useTranslate } from 'react-polyglot'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

import { StepperStep } from '../../StepperStep'

export type SharedApprovalStepCompleteProps = {
  titleTranslation: string
  isLoading: boolean | undefined
  transactionExecutionState: TransactionExecutionState
  description: JSX.Element
  stepIndicator: JSX.Element
}

export const SharedApprovalStepComplete = ({
  titleTranslation,
  isLoading,
  transactionExecutionState,
  description,
  stepIndicator,
}: SharedApprovalStepCompleteProps) => {
  const translate = useTranslate()

  return (
    <StepperStep
      title={translate(titleTranslation)}
      description={description}
      stepIndicator={stepIndicator}
      content={undefined}
      isLastStep={false}
      isLoading={isLoading}
      isError={transactionExecutionState === TransactionExecutionState.Failed}
      isPending={transactionExecutionState === TransactionExecutionState.Pending}
    />
  )
}
