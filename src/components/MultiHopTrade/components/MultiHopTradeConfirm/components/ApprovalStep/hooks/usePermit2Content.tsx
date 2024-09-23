import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState, TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useSignPermit2 } from '../../../hooks/useSignPermit2'
import { AllowanceApprovalContent } from '../components/ApprovalContent'

export type UsePermit2ContentProps = {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  activeTradeId: TradeQuote['id']
}

export const usePermit2Content = ({
  tradeQuoteStep,
  hopIndex,
  activeTradeId,
}: UsePermit2ContentProps) => {
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex,
    }
  }, [activeTradeId, hopIndex])

  const { state: hopExecutionState, permit2 } = useAppSelector(state =>
    selectHopExecutionMetadata(state, hopExecutionMetadataFilter),
  )

  const { signPermit2 } = useSignPermit2(tradeQuoteStep, hopIndex, activeTradeId)

  const isButtonDisabled = useMemo(() => {
    const isAwaitingPermit2 = hopExecutionState === HopExecutionState.AwaitingPermit2
    const isDisabled =
      !isAwaitingPermit2 || permit2.state !== TransactionExecutionState.AwaitingConfirmation

    return isDisabled
  }, [permit2.state, hopExecutionState])

  const content = useMemo(() => {
    if (hopExecutionState !== HopExecutionState.AwaitingAllowanceApproval) return
    return (
      <AllowanceApprovalContent
        buttonTranslation='permit2.signMessage'
        isDisabled={isButtonDisabled}
        isLoading={false /* TODO: loading state when signature in progress */}
        titleTranslation='permit2.title'
        tooltipTranslation='permit2.tooltip'
        transactionExecutionState={permit2.state}
        onSubmit={signPermit2}
      />
    )
  }, [hopExecutionState, isButtonDisabled, permit2.state, signPermit2])

  const description = useMemo(() => {
    const isError = permit2.state === TransactionExecutionState.Failed
    return (
      <>
        {isError && <Text color='text.error' translation='permit2.error' fontWeight='bold' />}
        <Text color='text.subtle' translation='permit2.description' fontWeight='bold' />
      </>
    )
  }, [permit2.state])

  return {
    content,
    description,
  }
}
