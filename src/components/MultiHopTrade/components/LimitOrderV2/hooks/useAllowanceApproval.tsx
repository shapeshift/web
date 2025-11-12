import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { COW_SWAP_VAULT_RELAYER_ADDRESS, SwapperName } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Hash } from 'viem'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import {
  AllowanceType,
  getApprovalAmountCryptoBaseUnit,
  useApprovalFees,
} from '@/hooks/queries/useApprovalFees'
import { useIsAllowanceApprovalRequired } from '@/hooks/queries/useIsAllowanceApprovalRequired'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { limitOrderSlice } from '@/state/slices/limitOrderSlice/limitOrderSlice'
import { selectActiveQuoteSellAsset } from '@/state/slices/limitOrderSlice/selectors'
import type { LimitOrderActiveQuote } from '@/state/slices/limitOrderSlice/types'
import { selectAccountNumberByAccountId } from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type UseAllowanceApprovalProps = {
  activeQuote: LimitOrderActiveQuote | undefined
  isQueryEnabled: boolean
  isRefetchEnabled: boolean
}

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = ({
  activeQuote,
  isQueryEnabled,
  isRefetchEnabled,
}: UseAllowanceApprovalProps) => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const dispatch = useAppDispatch()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const { showErrorToast } = useErrorToast()
  const wallet = useWallet().state.wallet ?? undefined

  const accountNumberFilter = useMemo(
    () => ({ accountId: activeQuote?.params.accountId }),
    [activeQuote?.params.accountId],
  )
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit,
      assetId: activeQuote?.params.sellAssetId,
      from: activeQuote?.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      isDisabled: !isQueryEnabled,
    })

  const { evmFeesResult } = useApprovalFees({
    amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit ?? '',
    assetId: activeQuote?.params.sellAssetId,
    from: activeQuote?.params.sellAccountAddress,
    allowanceType: AllowanceType.Unlimited, // All limit order approvals are unlimited
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    enabled: isQueryEnabled,
    isRefetchEnabled,
  })

  useEffect(() => {
    if (!isQueryEnabled || isAllowanceApprovalRequired !== false) return
    if (!activeQuote?.response.id) {
      console.error('Attempting to approve with undefined quoteId')
      return
    }

    // Mark the whole allowance approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(limitOrderSlice.actions.setAllowanceApprovalStepComplete(activeQuote.response.id))
  }, [activeQuote?.response.id, dispatch, isAllowanceApprovalRequired, isQueryEnabled])

  const allowanceApprovalMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber,
      amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        activeQuote?.params.sellAmountCryptoBaseUnit ?? '',
        AllowanceType.Unlimited, // All limit order approvals are unlimited
      ),
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
      dispatch(limitOrderSlice.actions.setAllowanceApprovalTxPending(activeQuote.response.id))
    },
    onSuccess: async txHash => {
      if (!activeQuote?.response.id) {
        console.error('Attempting to approve with undefined quoteId')
        return
      }
      dispatch(
        limitOrderSlice.actions.setAllowanceApprovalTxHash({
          txHash,
          id: activeQuote.response.id,
        }),
      )

      if (!activeQuote) return

      // All limit order approvals are unlimited
      const amountCryptoPrecision = 'Infinite ∞'

      const sellAsset = selectActiveQuoteSellAsset(store.getState())

      if (!sellAsset) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Approve,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.Approve,
            txHash,
            chainId: activeQuote.params.chainId,

            accountId: activeQuote.params.accountId,
            amountCryptoPrecision,
            assetId: activeQuote.params.sellAssetId,
            contractName: SwapperName.CowSwap,
            message: 'actionCenter.approve.approvalTxPending',
          },
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      const publicClient = assertGetViemClient(activeQuote?.params.chainId ?? '')
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      dispatch(limitOrderSlice.actions.setAllowanceApprovalTxComplete(activeQuote.response.id))
    },
    onError(err) {
      if (!activeQuote?.response.id) {
        console.error('Attempting to approve with undefined quoteId')
        return
      }
      dispatch(limitOrderSlice.actions.setAllowanceApprovalTxFailed(activeQuote.response.id))
      showErrorToast(err)
    },
  })

  return {
    isLoading: allowanceCryptoBaseUnitResult.isFetching || evmFeesResult.isFetching,
    allowanceApprovalMutation,
    approvalNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
    isAllowanceApprovalRequired,
  }
}
