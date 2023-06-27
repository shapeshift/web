import { useCallback, useEffect, useState } from 'react'
import type { TradeQuote } from 'lib/swapper/api'

import { useApprovalTx } from './hooks/useApprovalTx'
import { useExecuteAllowanceApproval } from './hooks/useExecuteAllowanceApproval'
import { useIsApprovalNeeded } from './hooks/useIsApprovalNeeded'

export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuote['steps'][number],
  isExactAllowance: boolean,
) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { isApprovalNeeded, stopPolling: stopPollingIsApprovalNeeded } =
    useIsApprovalNeeded(tradeQuoteStep)
  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
  } = useApprovalTx(tradeQuoteStep, isExactAllowance)

  const { executeAllowanceApproval: _executeAllowanceApproval, txId: approvalTxId } =
    useExecuteAllowanceApproval(tradeQuoteStep, buildCustomTxInput)

  const executeAllowanceApproval = useCallback(() => {
    stopPollingIsApprovalNeeded() // prevent approval UI disappearing after approval is processed
    stopPollingBuildApprovalTx()
    return _executeAllowanceApproval()
  }, [_executeAllowanceApproval, stopPollingBuildApprovalTx, stopPollingIsApprovalNeeded])

  useEffect(() => {
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
  }
}
