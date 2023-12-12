import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useEffect } from 'react'
import type { Hash } from 'viem'
import { useApprovalTx } from 'components/MultiHopTrade/hooks/useAllowanceApproval/hooks/useApprovalTx'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { assertGetEvmChainAdapter, buildAndBroadcast } from 'lib/utils/evm'
import { assertGetViemClient } from 'lib/viem-client'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useIsApprovalNeeded } from './useIsApprovalNeeded'

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  isExactAllowance: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()

  const sellAssetAccountId = useAppSelector(state => selectHopSellAccountId(state, hopIndex))

  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
    isLoading,
  } = useApprovalTx(tradeQuoteStep, hopIndex, isExactAllowance)

  const { isLoading: isApprovalNeededLoading, isApprovalNeeded } = useIsApprovalNeeded(
    tradeQuoteStep,
    sellAssetAccountId,
    true,
  )

  useEffect(() => {
    // Mark the approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    if (!isApprovalNeededLoading && !isApprovalNeeded) {
      dispatch(tradeQuoteSlice.actions.setApprovalStepComplete({ hopIndex }))
    }
  }, [dispatch, hopIndex, isApprovalNeeded, isApprovalNeededLoading])

  const chainId = tradeQuoteStep.sellAsset.chainId

  const executeAllowanceApproval = useCallback(async () => {
    if (isLoading || !isApprovalNeeded) return

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
    isApprovalNeeded,
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
