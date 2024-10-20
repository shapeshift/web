import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
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
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  allowanceType: AllowanceType,
  feeQueryEnabled: boolean,
  confirmedTradeId: TradeQuote['id'],
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet ?? undefined

  const hopSellAccountIdFilter = useMemo(() => ({ hopIndex }), [hopIndex])
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const isReset = useMemo(() => allowanceType === AllowanceType.Reset, [allowanceType])

  const {
    allowanceCryptoBaseUnitResult,
    evmFeesResult,
    isApprovalRequired,
    isAllowanceResetRequired,
  } = useApprovalFees({
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
    dispatch(tradeQuoteSlice.actions.setApprovalStepComplete({ hopIndex, id: confirmedTradeId }))
  }, [dispatch, hopIndex, isApprovalRequired, confirmedTradeId])

  useEffect(() => {
    if (isAllowanceResetRequired !== false || allowanceType !== AllowanceType.Reset) return

    // Mark the allowance reset step complete as required.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval reset externally and have the app respond to the updated allowance on chain.
    dispatch(tradeQuoteSlice.actions.setApprovalResetComplete({ hopIndex, id: confirmedTradeId }))
  }, [dispatch, hopIndex, isAllowanceResetRequired, confirmedTradeId, allowanceType])

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        allowanceType,
      ),
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      wallet,
    }),
    onMutate() {
      dispatch(
        tradeQuoteSlice.actions.setApprovalTxPending({ hopIndex, isReset, id: confirmedTradeId }),
      )
    },
    async onSuccess(txHash) {
      dispatch(
        tradeQuoteSlice.actions.setApprovalTxHash({
          hopIndex,
          txHash,
          isReset,
          id: confirmedTradeId,
        }),
      )

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(
        tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex, isReset, id: confirmedTradeId }),
      )
    },
    onError(err) {
      dispatch(
        tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex, isReset, id: confirmedTradeId }),
      )
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
