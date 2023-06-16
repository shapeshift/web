import { useCallback } from 'react'
import type { TradeQuote } from 'lib/swapper/api'

import { useBuildApprovalTx } from './hooks/useBuildApprovalTx'
import { useExecuteAllowanceApproval } from './hooks/useExecuteAllowanceApproval'
import { useIsApprovalNeeded } from './hooks/useIsApprovalNeeded'

export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuote['steps'][number],
  isExactAllowance: boolean,
) => {
  const { isApprovalNeeded, stopPolling: stopPollingIsApprovalNeeded } =
    useIsApprovalNeeded(tradeQuoteStep)
  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
  } = useBuildApprovalTx(tradeQuoteStep, isExactAllowance)

  const { executeAllowanceApproval: _executeAllowanceApproval, txId: approvalTxId } =
    useExecuteAllowanceApproval(tradeQuoteStep, buildCustomTxInput)

  const executeAllowanceApproval = useCallback(() => {
    stopPollingIsApprovalNeeded() // prevent approval UI disappearing after approval is processed
    stopPollingBuildApprovalTx()
    return _executeAllowanceApproval()
  }, [_executeAllowanceApproval, stopPollingBuildApprovalTx, stopPollingIsApprovalNeeded])

  return {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
  }
}
