import { fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/src/swappers/utils/constants'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import { useApprovalFees } from 'hooks/queries/useApprovalFees'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetViemClient } from 'lib/viem-client'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  isExactAllowance: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet ?? undefined
  const sellAssetAccountId = useAppSelector(state => selectHopSellAccountId(state, hopIndex))

  const { allowanceQueryResult, evmFeesQueryResult, isApprovalRequired } = useApprovalFees({
    accountNumber: tradeQuoteStep.accountNumber,
    amountCryptoBaseUnit: tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    isExactAllowance,
    spender: tradeQuoteStep.allowanceContract,
  })

  useEffect(() => {
    console.log({ isApprovalRequired })
    if (isApprovalRequired !== false) return

    // Mark the approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(tradeQuoteSlice.actions.setApprovalStepComplete({ hopIndex }))
  }, [dispatch, hopIndex, isApprovalRequired])

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: isExactAllowance
        ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
        : MAX_ALLOWANCE,
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      wallet,
    }),
    onMutate() {
      dispatch(tradeQuoteSlice.actions.setApprovalTxPending({ hopIndex }))
    },
    async onSuccess(txHash) {
      dispatch(tradeQuoteSlice.actions.setApprovalTxHash({ hopIndex, txHash }))

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex }))
    },
    onError(err) {
      dispatch(tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex }))
      showErrorToast(err)
    },
  })

  return useMemo(() => {
    return {
      isLoading: allowanceQueryResult.isLoading || evmFeesQueryResult.isLoading,
      approveMutation,
      approvalNetworkFeeCryptoBaseUnit: evmFeesQueryResult.data?.networkFeeCryptoBaseUnit,
    }
  }, [
    allowanceQueryResult.isLoading,
    approveMutation,
    evmFeesQueryResult.data,
    evmFeesQueryResult.isLoading,
  ])
}
