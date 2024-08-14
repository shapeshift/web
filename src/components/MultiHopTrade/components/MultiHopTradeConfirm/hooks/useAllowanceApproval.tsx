import { fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import {
  AllowanceType,
  getApprovalAmountCryptoBaseUnit,
  useApprovalFees,
} from 'hooks/queries/useApprovalFees'
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
  allowanceType: AllowanceType,
  feeQueryEnabled: boolean,
  tradeId: TradeQuote['id'],
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet ?? undefined
  const sellAssetAccountId = useAppSelector(state => selectHopSellAccountId(state, hopIndex))

  const isReset = useMemo(() => allowanceType === AllowanceType.Reset, [allowanceType])

  const { allowanceCryptoBaseUnitResult, evmFeesResult, isApprovalRequired } = useApprovalFees({
    accountNumber: tradeQuoteStep.accountNumber,
    amountCryptoBaseUnit: tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    allowanceType,
    spender: tradeQuoteStep.allowanceContract,
    enabled: feeQueryEnabled,
  })

  useEffect(() => {
    if (isApprovalRequired !== false) return

    // Mark the approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(tradeQuoteSlice.actions.setApprovalStepComplete({ hopIndex, id: tradeId }))
  }, [dispatch, hopIndex, isApprovalRequired, tradeId])

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        allowanceType,
      ),
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      wallet,
    }),
    onMutate() {
      dispatch(tradeQuoteSlice.actions.setApprovalTxPending({ hopIndex, isReset, id: tradeId }))
    },
    async onSuccess(txHash) {
      dispatch(
        tradeQuoteSlice.actions.setApprovalTxHash({ hopIndex, txHash, isReset, id: tradeId }),
      )

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex, isReset, id: tradeId }))
    },
    onError(err) {
      dispatch(tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex, isReset, id: tradeId }))
      showErrorToast(err)
    },
  })

  return useMemo(() => {
    return {
      isLoading: allowanceCryptoBaseUnitResult.isLoading || evmFeesResult.isLoading,
      approveMutation,
      approvalNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
    }
  }, [
    allowanceCryptoBaseUnitResult.isLoading,
    approveMutation,
    evmFeesResult.data,
    evmFeesResult.isLoading,
  ])
}
