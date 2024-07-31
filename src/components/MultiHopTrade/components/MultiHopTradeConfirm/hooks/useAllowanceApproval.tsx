import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo } from 'react'
import type { Hash } from 'viem'
import { useApprovalTx } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useApprovalTx'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { assertGetEvmChainAdapter, buildAndBroadcast } from 'lib/utils/evm'
import { assertGetViemClient } from 'lib/viem-client'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AllowanceType } from './helpers'
import { useIsApprovalNeeded } from './useIsApprovalNeeded'

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  allowanceType: AllowanceType,
  isAwaitingReset: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()

  const sellAssetAccountId = useAppSelector(state => selectHopSellAccountId(state, hopIndex))

  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
    isLoading,
  } = useApprovalTx(tradeQuoteStep, hopIndex, allowanceType)

  const { isLoading: isApprovalNeededLoading, data: isApprovalNeededData } = useIsApprovalNeeded(
    tradeQuoteStep,
    sellAssetAccountId,
  )

  useEffect(() => {
    // Mark the approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    if (!isApprovalNeededLoading && !isApprovalNeededData?.isApprovalNeeded) {
      dispatch(tradeQuoteSlice.actions.setApprovalStepComplete({ hopIndex }))
    }
  }, [dispatch, hopIndex, isApprovalNeededData, isApprovalNeededLoading])

  const chainId = tradeQuoteStep.sellAsset.chainId

  const executeAllowanceApproval = useCallback(async () => {
    if (isLoading || !isApprovalNeededData?.isApprovalNeeded) return

    const isReset = allowanceType === AllowanceType.Reset

    stopPollingBuildApprovalTx()
    dispatch(
      tradeQuoteSlice.actions.setApprovalTxPending({
        hopIndex,
        isReset,
      }),
    )

    try {
      if (!buildCustomTxInput) {
        throw Error('missing buildCustomTxInput')
      }

      const adapter = assertGetEvmChainAdapter(chainId)

      const txHash = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      dispatch(tradeQuoteSlice.actions.setApprovalTxHash({ hopIndex, txHash, isReset }))

      const publicClient = assertGetViemClient(chainId)

      await publicClient.waitForTransactionReceipt({
        hash: txHash as Hash,
      })

      dispatch(tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex, isReset }))
    } catch (e) {
      dispatch(tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex, isReset }))
      showErrorToast(e)
    }
  }, [
    allowanceType,
    buildCustomTxInput,
    chainId,
    dispatch,
    hopIndex,
    isApprovalNeededData?.isApprovalNeeded,
    isLoading,
    showErrorToast,
    stopPollingBuildApprovalTx,
  ])

  const result = useMemo(
    () => ({
      isLoading: isLoading || isAwaitingReset,
      executeAllowanceApproval,
      approvalNetworkFeeCryptoBaseUnit,
    }),
    [approvalNetworkFeeCryptoBaseUnit, executeAllowanceApproval, isAwaitingReset, isLoading],
  )

  return result
}
