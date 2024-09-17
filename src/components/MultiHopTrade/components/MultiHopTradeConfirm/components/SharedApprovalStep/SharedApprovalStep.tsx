import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import type { AllowanceType } from 'hooks/queries/useApprovalFees'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'

import {
  SharedApprovalDescription,
  SharedCompletedApprovalDescription,
} from './components/SharedApprovalDescription'
import { SharedApprovalStepComplete } from './components/SharedApprovalStepComplete'
import { SharedApprovalStepPending } from './components/SharedApprovalStepPending'
import type { RenderAllowanceContentCallback } from './types'

export type SharedApprovalStepProps = {
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
  txHash?: string
  allowanceType: AllowanceType
  renderContent: RenderAllowanceContentCallback
}

export const SharedApprovalStep = ({
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
  const isComplete = useMemo(() => {
    return [
      HopExecutionState.AwaitingApproval,
      HopExecutionState.AwaitingSwap,
      HopExecutionState.Complete,
    ].includes(hopExecutionState)
  }, [hopExecutionState])

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
    (approvalNetworkFeeCryptoFormatted?: string) => {
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
