import { useCallback, useEffect, useState } from 'react'
import type { TradeQuoteStep } from 'lib/swapper/types'

import { useApprovalTx } from './hooks/useApprovalTx'
import { useExecuteAllowanceApproval } from './hooks/useExecuteAllowanceApproval'
import { useIsApprovalNeeded } from './hooks/useIsApprovalNeeded'

export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  isFirstHop: boolean,
  isExactAllowance: boolean,
) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { isApprovalNeeded } = useIsApprovalNeeded(tradeQuoteStep, isFirstHop)
  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
  } = useApprovalTx(tradeQuoteStep, isFirstHop, isExactAllowance)

  const {
    executeAllowanceApproval: _executeAllowanceApproval,
    txId: approvalTxId,
    txStatus: approvalTxStatus,
  } = useExecuteAllowanceApproval(tradeQuoteStep, isFirstHop, buildCustomTxInput)

  const executeAllowanceApproval = useCallback(() => {
    stopPollingBuildApprovalTx()
    return _executeAllowanceApproval()
  }, [_executeAllowanceApproval, stopPollingBuildApprovalTx])

  useEffect(() => {
    // update the loading state to true if the approval requirement is not undefined
    // AND the current loading state is not already the same as the target loading state
    if (isApprovalNeeded !== undefined && isLoading) {
      setIsLoading(false)
    } else if (isApprovalNeeded === undefined && !isLoading) {
      setIsLoading(true)
    }
  }, [isApprovalNeeded, isLoading])

  return {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading,
    approvalTxStatus,
  }
}
