import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { AllowanceType } from 'hooks/queries/useApprovalFees'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { HopExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector } from 'state/store'

import { useAllowanceApproval } from './useAllowanceApproval'
import { useAllowanceReset } from './useAllowanceReset'
import { useCurrentHopIndex } from './useCurrentHopIndex'
import { useSignPermit2 } from './useSignPermit2'

type UseSignAllowanceApprovalProps = {
  tradeQuoteStep: TradeQuoteStep
  isExactAllowance: boolean | undefined
  activeTradeId: string
}

export const useActiveTradeAllowance = ({
  tradeQuoteStep,
  isExactAllowance,
  activeTradeId,
}: UseSignAllowanceApprovalProps) => {
  // DO NOT REMOVE ME. Fetches and upserts permit2 quotes at pre-permit2-signing time
  useGetTradeQuotes()

  const currentHopIndex = useCurrentHopIndex()

  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: activeTradeId,
      hopIndex: currentHopIndex,
    }
  }, [activeTradeId, currentHopIndex])

  const {
    state: hopExecutionState,
    allowanceApproval,
    allowanceReset,
    permit2,
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const { signPermit2 } = useSignPermit2(tradeQuoteStep, currentHopIndex, activeTradeId)

  const isAllowanceApprovalEnabled = useMemo(() => {
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
    isExactAllowance && !permit2.isRequired ? AllowanceType.Exact : AllowanceType.Unlimited,
    isAllowanceApprovalEnabled,
    activeTradeId,
    allowanceApproval.isInitiallyRequired ?? false,
  )

  const isAllowanceResetEnabled = useMemo(() => {
    return (
      Boolean(allowanceReset.isRequired) &&
      [HopExecutionState.Pending, HopExecutionState.AwaitingAllowanceReset].includes(
        hopExecutionState,
      )
    )
  }, [allowanceReset.isRequired, hopExecutionState])

  const {
    allowanceResetMutation,
    allowanceResetNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceResetLoading,
  } = useAllowanceReset(
    tradeQuoteStep,
    currentHopIndex,
    AllowanceType.Reset,
    isAllowanceResetEnabled,
    activeTradeId,
    allowanceReset.isInitiallyRequired ?? false,
  )

  return {
    handleSignAllowanceApproval: approveMutation.mutate,
    handleSignAllowanceReset: allowanceResetMutation.mutate,
    isAllowanceApprovalLoading,
    isAllowanceApprovalPending: approveMutation.isPending,
    isAllowanceResetLoading,
    isAllowanceResetPending: allowanceResetMutation.isPending,
    approvalNetworkFeeCryptoBaseUnit,
    allowanceResetNetworkFeeCryptoBaseUnit,
    signPermit2,
  }
}
