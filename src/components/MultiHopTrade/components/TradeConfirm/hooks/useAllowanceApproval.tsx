import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import type { AllowanceType } from 'hooks/queries/useApprovalFees'
import { getApprovalAmountCryptoBaseUnit, useApprovalFees } from 'hooks/queries/useApprovalFees'
import { useIsAllowanceApprovalRequired } from 'hooks/queries/useIsAllowanceApprovalRequired'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
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
  isInitiallyRequired: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorToast()
  const wallet = useWallet().state.wallet ?? undefined

  const hopSellAccountIdFilter = useMemo(() => ({ hopIndex }), [hopIndex])
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetId: tradeQuoteStep?.sellAsset.assetId,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      spender: tradeQuoteStep?.allowanceContract,
    })

  const { evmFeesResult } = useApprovalFees({
    amountCryptoBaseUnit: tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    allowanceType,
    spender: tradeQuoteStep.allowanceContract,
    enabled: isInitiallyRequired && feeQueryEnabled,
  })
  useEffect(() => {
    if (!feeQueryEnabled || !isInitiallyRequired || isAllowanceApprovalRequired !== false) return

    // Mark the whole allowance approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(
      tradeQuoteSlice.actions.setAllowanceApprovalStepComplete({ hopIndex, id: confirmedTradeId }),
    )
  }, [
    dispatch,
    hopIndex,
    isAllowanceApprovalRequired,
    confirmedTradeId,
    isInitiallyRequired,
    feeQueryEnabled,
  ])

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
        tradeQuoteSlice.actions.setAllowanceApprovalTxPending({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    async onSuccess(txHash) {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxHash({
          hopIndex,
          txHash,
          id: confirmedTradeId,
        }),
      )

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxComplete({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    onError(err) {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxFailed({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
      showErrorToast(err)
    },
  })

  return {
    isLoading: allowanceCryptoBaseUnitResult.isLoading || evmFeesResult.isLoading,
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
  }
}
