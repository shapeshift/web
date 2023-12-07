import { useCallback } from 'react'
import type { Hash } from 'viem'
import { useApprovalTx } from 'components/MultiHopTrade/hooks/useAllowanceApproval/hooks/useApprovalTx'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { assertGetEvmChainAdapter, buildAndBroadcast } from 'lib/utils/evm'
import { assertGetViemClient } from 'lib/viem-client'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch } from 'state/store'

export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  isExactAllowance: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()

  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
    isLoading,
  } = useApprovalTx(tradeQuoteStep, hopIndex === 0, isExactAllowance)

  const chainId = tradeQuoteStep.sellAsset.chainId

  const executeAllowanceApproval = useCallback(async () => {
    if (isLoading) return

    stopPollingBuildApprovalTx()
    dispatch(tradeQuoteSlice.actions.setApprovalTxPending({ hopIndex }))

    try {
      if (!buildCustomTxInput) {
        throw Error('missing buildCustomTxInput')
      }

      const adapter = assertGetEvmChainAdapter(chainId)

      const txHash = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: undefined, // no receiver for this contract call
      })

      dispatch(tradeQuoteSlice.actions.setApprovalTxHash({ hopIndex, txHash }))

      const publicClient = assertGetViemClient(chainId)

      await publicClient.waitForTransactionReceipt({
        hash: txHash as Hash,
      })

      dispatch(tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex }))
    } catch (e) {
      dispatch(tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex }))
      showErrorToast(e)
    }
  }, [
    buildCustomTxInput,
    chainId,
    dispatch,
    hopIndex,
    isLoading,
    showErrorToast,
    stopPollingBuildApprovalTx,
  ])

  return {
    isLoading,
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit,
  }
}
