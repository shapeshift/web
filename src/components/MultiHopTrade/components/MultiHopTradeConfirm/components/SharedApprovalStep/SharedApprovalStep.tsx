import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import type { AllowanceType } from 'hooks/queries/useApprovalFees'
import type { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

import {
  SharedApprovalDescription,
  SharedCompletedApprovalDescription,
} from './components/SharedApprovalDescription'
import { SharedApprovalStepComplete } from './components/SharedApprovalStepComplete'
import { SharedApprovalStepPending } from './components/SharedApprovalStepPending'
import type { RenderAllowanceContentCallback } from './types'

export type SharedApprovalStepProps = {
  isComplete: boolean
  titleTranslation: string
  errorTranslation: string
  gasFeeLoadingTranslation: string
  gasFeeTranslation: string
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isLoading?: boolean
  activeTradeId: TradeQuote['id']
  hopExecutionState: HopExecutionState
  transactionExecutionState: TransactionExecutionState
  stepIndicator: JSX.Element
  txHash: string | undefined
  allowanceType: AllowanceType
  renderContent: RenderAllowanceContentCallback
}

export const SharedApprovalStep = ({
  isComplete,
  tradeQuoteStep,
  hopIndex,
  isLoading,
  activeTradeId,
  hopExecutionState,
  transactionExecutionState,
  titleTranslation,
  txHash,
  errorTranslation,
  gasFeeLoadingTranslation,
  gasFeeTranslation,
  stepIndicator,
  allowanceType,
  renderContent,
}: SharedApprovalStepProps) => {
  const completedDescription = useMemo(() => {
    return (
      <SharedCompletedApprovalDescription
        tradeQuoteStep={tradeQuoteStep}
        isError={transactionExecutionState === TransactionExecutionState.Failed}
        txHash={txHash ?? ''}
        errorTranslation={errorTranslation}
      />
    )
  }, [tradeQuoteStep, transactionExecutionState, txHash, errorTranslation])

  const renderDescription = useCallback(
    (approvalNetworkFeeCryptoFormatted: string) => {
      return (
        <SharedApprovalDescription
          tradeQuoteStep={tradeQuoteStep}
          isError={transactionExecutionState === TransactionExecutionState.Failed}
          txHash={txHash}
          approvalNetworkFeeCryptoFormatted={approvalNetworkFeeCryptoFormatted}
          errorTranslation={errorTranslation}
          gasFeeLoadingTranslation={gasFeeLoadingTranslation}
          gasFeeTranslation={gasFeeTranslation}
        />
      )
    },
    [
      tradeQuoteStep,
      transactionExecutionState,
      txHash,
      errorTranslation,
      gasFeeLoadingTranslation,
      gasFeeTranslation,
    ],
  )

  // separate component for completed states to simplify hook dismount
  return isComplete ? (
    <SharedApprovalStepComplete
      titleTranslation={titleTranslation}
      isLoading={isLoading}
      transactionExecutionState={transactionExecutionState}
      description={completedDescription}
      stepIndicator={stepIndicator}
    />
  ) : (
    <SharedApprovalStepPending
      titleTranslation={titleTranslation}
      tradeQuoteStep={tradeQuoteStep}
      hopIndex={hopIndex}
      isLoading={isLoading}
      activeTradeId={activeTradeId}
      renderDescription={renderDescription}
      stepIndicator={stepIndicator}
      renderContent={renderContent}
      hopExecutionState={hopExecutionState}
      transactionExecutionState={transactionExecutionState}
      allowanceType={allowanceType}
    />
  )
}
