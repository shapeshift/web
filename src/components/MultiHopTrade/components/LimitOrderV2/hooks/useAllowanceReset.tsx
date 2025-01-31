import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import { AllowanceType, useApprovalFees } from 'hooks/queries/useApprovalFees'
import { useIsAllowanceResetRequired } from 'hooks/queries/useIsAllowanceResetRequired'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import type { LimitOrderActiveQuote } from 'state/slices/limitOrderSlice/types'
import { selectAccountNumberByAccountId } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type UseAllowanceResetProps = {
  activeQuote: LimitOrderActiveQuote | undefined
  isQueryEnabled: boolean
  isRefetchEnabled: boolean
}

// handles allowance reset tx execution, fees, and state orchestration
export const useAllowanceReset = ({
  activeQuote,
  isQueryEnabled,
  isRefetchEnabled,
}: UseAllowanceResetProps) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorToast()
  const wallet = useWallet().state.wallet ?? undefined

  const accountNumberFilter = useMemo(
    () => ({ accountId: activeQuote?.params.accountId }),
    [activeQuote?.params.accountId],
  )
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const { isAllowanceResetRequired, isLoading: isAllowanceResetRequirementsLoading } =
    useIsAllowanceResetRequired({
      amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit,
      assetId: activeQuote?.params.sellAssetId,
      from: activeQuote?.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      isDisabled: !isQueryEnabled,
    })

  const { evmFeesResult } = useApprovalFees({
    amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit ?? '',
    assetId: activeQuote?.params.sellAssetId ?? '',
    from: activeQuote?.params.sellAccountAddress,
    allowanceType: AllowanceType.Reset,
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    enabled: isQueryEnabled,
    isRefetchEnabled,
  })

  useEffect(() => {
    if (!isQueryEnabled || isAllowanceResetRequired !== false) return
    if (!activeQuote?.response.id) {
      console.error('Attempting to approve with undefined quoteId')
      return
    }

    // Mark the whole allowance approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(limitOrderSlice.actions.setAllowanceResetStepComplete(activeQuote.response.id))
  }, [activeQuote?.response.id, dispatch, isAllowanceResetRequired, isQueryEnabled])

  const allowanceResetMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber,
      amountCryptoBaseUnit: '0',
      assetId: activeQuote?.params.sellAssetId,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      from: activeQuote?.params.sellAccountAddress,
      wallet,
    }),
    onMutate() {
      if (!activeQuote?.response.id) {
        console.error('Attempting to approve with undefined quoteId')
        return
      }
      dispatch(limitOrderSlice.actions.setAllowanceResetTxPending(activeQuote.response.id))
    },
    async onSuccess(txHash) {
      if (!activeQuote?.response.id) {
        console.error('Attempting to approve with undefined quoteId')
        return
      }
      dispatch(
        limitOrderSlice.actions.setAllowanceResetTxHash({
          txHash,
          id: activeQuote.response.id,
        }),
      )

      const publicClient = assertGetViemClient(activeQuote.params.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(limitOrderSlice.actions.setAllowanceResetTxComplete(activeQuote.response.id))
    },
    onError(err) {
      showErrorToast(err)
      if (!activeQuote?.response.id) {
        console.error('Attempting to approve with undefined quoteId')
        return
      }
      dispatch(limitOrderSlice.actions.setAllowanceResetTxFailed(activeQuote.response.id))
    },
  })

  return {
    isLoading: isAllowanceResetRequirementsLoading || evmFeesResult.isLoading,
    allowanceResetMutation,
    allowanceResetNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
    isAllowanceResetRequired,
  }
}
