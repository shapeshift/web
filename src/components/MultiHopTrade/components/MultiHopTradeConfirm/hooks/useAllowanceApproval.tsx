import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useCallback, useEffect, useMemo } from 'react'
import type { Hash } from 'viem'
import { useApprovalTx } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useApprovalTx'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { assertGetEvmChainAdapter, buildAndBroadcast } from 'lib/utils/evm'
import { assertGetViemClient } from 'lib/viem-client'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectFirstHopSellAccountId, selectSecondHopSellAccountId } from 'state/slices/selectors'
import {
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
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

  const secondHop = useAppSelector(selectSecondHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  // TODO(gomes): this is temporary while devving - we should use the previous selectHopSellAccountId selector, if arity is happy there,
  // else fix it and still use it because this is ugly
  const firstHopSellAssetAccountId = useAppSelector(state => selectFirstHopSellAccountId(state))

  // the network fee asset for the second hop in the trade
  const secondHopSellFeeAsset = useAppSelector(state =>
    isMultiHopTrade && secondHop
      ? selectFeeAssetById(state, secondHop?.sellAsset.assetId)
      : undefined,
  )

  const secondHopSellAssetAccountId = useAppSelector(state =>
    selectSecondHopSellAccountId(state, {
      chainId: secondHopSellFeeAsset?.chainId,
      accountNumber: secondHop?.accountNumber,
    }),
  )
  const sellAssetAccountId =
    hopIndex === 0 ? firstHopSellAssetAccountId : secondHopSellAssetAccountId

  const {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling: stopPollingBuildApprovalTx,
    isLoading,
  } = useApprovalTx(tradeQuoteStep, hopIndex, isExactAllowance)

  const { isLoading: isApprovalNeededLoading, isApprovalNeeded } = useIsApprovalNeeded(
    tradeQuoteStep,
    sellAssetAccountId,
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
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
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

  const result = useMemo(
    () => ({
      isLoading,
      executeAllowanceApproval,
      approvalNetworkFeeCryptoBaseUnit,
    }),
    [approvalNetworkFeeCryptoBaseUnit, executeAllowanceApproval, isLoading],
  )

  return result
}
