import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import { AllowanceType, useApprovalFees } from 'hooks/queries/useApprovalFees'
import { useIsAllowanceResetRequired } from 'hooks/queries/useIsAllowanceResetRequired'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

// handles allowance reset tx execution, fees, and state orchestration
export const useAllowanceReset = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  allowanceType: AllowanceType,
  feeQueryEnabled: boolean,
  confirmedTradeId: TradeQuote['id'],
  isInitiallyRequired: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet ?? undefined

  const hopSellAccountIdFilter = useMemo(() => ({ hopIndex }), [hopIndex])
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const { isAllowanceResetRequired, isLoading: isAllowanceResetRequirementsLoading } =
    useIsAllowanceResetRequired({
      amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetId: tradeQuoteStep?.sellAsset.assetId,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      spender: tradeQuoteStep?.allowanceContract,
      isDisabled: !(isInitiallyRequired && feeQueryEnabled),
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
    if (
      !isInitiallyRequired ||
      isAllowanceResetRequired !== false ||
      allowanceType !== AllowanceType.Reset
    )
      return

    // Mark the allowance reset step complete as required.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval reset externally and have the app respond to the updated allowance on chain.
    dispatch(
      tradeQuoteSlice.actions.setAllowanceResetStepComplete({ hopIndex, id: confirmedTradeId }),
    )
  }, [
    dispatch,
    hopIndex,
    isAllowanceResetRequired,
    confirmedTradeId,
    allowanceType,
    isInitiallyRequired,
  ])

  const allowanceResetMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: '0',
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      wallet,
    }),
    onMutate() {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceResetTxPending({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    async onSuccess(txHash) {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceResetTxHash({
          hopIndex,
          txHash,
          id: confirmedTradeId,
        }),
      )

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(
        tradeQuoteSlice.actions.setAllowanceResetTxComplete({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    onError(err) {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceResetTxFailed({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
      showErrorToast(err)
    },
  })

  return {
    isLoading: isAllowanceResetRequirementsLoading || evmFeesResult.isLoading,
    allowanceResetMutation,
    allowanceResetNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
  }
}
