import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { isPermit2Hop } from '../../MultiHopTradeConfirm/hooks/helpers'
import { useAllowanceApproval } from '../../MultiHopTradeConfirm/hooks/useAllowanceApproval'

type UseSignAllowanceApprovalProps = {
  tradeQuoteStep: TradeQuoteStep
  isExactAllowance: boolean | undefined
  currentHopIndex: number
  activeTradeId: string
}

export const useSignAllowanceApproval = ({
  tradeQuoteStep,
  isExactAllowance,
  currentHopIndex,
  activeTradeId,
}: UseSignAllowanceApprovalProps) => {
  // TODO: confirm this is actually needed in the new flow
  // DO NOT REMOVE ME. Fetches and upserts permit2 quotes at pre-permit2-signing time
  useGetTradeQuotes()

  const isPermit2 = useMemo(() => {
    return isPermit2Hop(tradeQuoteStep)
  }, [tradeQuoteStep])

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex: currentHopIndex,
    }
  }, [activeTradeId, currentHopIndex])

  const {
    state: hopExecutionState,
    allowanceApproval,
    // allowanceReset,
    // permit2,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const isEnabled = useMemo(() => {
    return (
      Boolean(allowanceApproval.isRequired) &&
      [
        HopExecutionState.Pending,
        HopExecutionState.AwaitingAllowanceReset,
        HopExecutionState.AwaitingAllowanceApproval,
      ].includes(hopExecutionState)
    )
  }, [allowanceApproval.isRequired, hopExecutionState])

  const {
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalLoading,
  } = useAllowanceApproval(
    tradeQuoteStep,
    currentHopIndex,
    // Permit2 should always have unlimited allowance
    isExactAllowance && !isPermit2 ? AllowanceType.Exact : AllowanceType.Unlimited,
    isEnabled,
    activeTradeId,
    allowanceApproval.isInitiallyRequired,
  )

  const handleSignAllowanceApproval = useCallback(async () => {
    try {
      await approveMutation.mutateAsync()
    } catch (error) {
      console.error(error)
    }
  }, [approveMutation])

  return {
    handleSignAllowanceApproval,
    isLoading: isAllowanceApprovalLoading,
    approvalNetworkFeeCryptoBaseUnit,
  }
}
