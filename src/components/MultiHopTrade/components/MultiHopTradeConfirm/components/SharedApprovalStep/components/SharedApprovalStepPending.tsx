import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AllowanceType } from 'hooks/queries/useApprovalFees'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetById } from 'state/slices/selectors'
import type { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useAllowanceApproval } from '../../../hooks/useAllowanceApproval'
import { StepperStep } from '../../StepperStep'
import type { RenderAllowanceContentCallback } from '../types'

export type SharedApprovalStepPendingProps = {
  titleTranslation: string
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  isLoading?: boolean
  activeTradeId: string
  hopExecutionState: HopExecutionState
  transactionExecutionState: TransactionExecutionState
  stepIndicator: JSX.Element
  allowanceType: AllowanceType
  renderDescription: (approvalNetworkFeeCryptoFormatted: string) => JSX.Element
  renderContent: RenderAllowanceContentCallback
}

export const SharedApprovalStepPending = ({
  titleTranslation,
  tradeQuoteStep,
  hopIndex,
  isLoading,
  activeTradeId,
  stepIndicator,
  hopExecutionState,
  transactionExecutionState,
  allowanceType,
  renderDescription,
  renderContent,
}: SharedApprovalStepPendingProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const {
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(tradeQuoteStep, hopIndex, allowanceType, true, activeTradeId)

  const handleSignAllowanceApproval = useCallback(async () => {
    try {
      await approveMutation.mutateAsync()
    } catch (error) {
      console.error(error)
    }
  }, [approveMutation])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetById(state, tradeQuoteStep.sellAsset.assetId),
  )

  const approvalNetworkFeeCryptoFormatted = useMemo(() => {
    if (feeAsset && approvalNetworkFeeCryptoBaseUnit) {
      return toCrypto(
        fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
        feeAsset.symbol,
      )
    }

    return translate('common.loadingText').toLowerCase()
  }, [approvalNetworkFeeCryptoBaseUnit, feeAsset, toCrypto, translate])

  const content = useMemo(() => {
    return renderContent({
      hopExecutionState,
      transactionExecutionState,
      isAllowanceApprovalLoading,
      handleSignAllowanceApproval,
    })
  }, [
    handleSignAllowanceApproval,
    hopExecutionState,
    isAllowanceApprovalLoading,
    renderContent,
    transactionExecutionState,
  ])

  const description = useMemo(
    () => renderDescription(approvalNetworkFeeCryptoFormatted),
    [approvalNetworkFeeCryptoFormatted, renderDescription],
  )

  return (
    <StepperStep
      title={translate(titleTranslation)}
      description={description}
      stepIndicator={stepIndicator}
      content={content}
      isLastStep={false}
      isLoading={isLoading}
      isError={transactionExecutionState === TransactionExecutionState.Failed}
      isPending={transactionExecutionState === TransactionExecutionState.Pending}
    />
  )
}
