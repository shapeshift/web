import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useTCYClaims } from '../queries/useTcyClaims'

import { TcyClaimSaversNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/TcyClaimSaversNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getThorchainTransactionStatus } from '@/lib/utils/thorchain'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType, isTcyClaimAction } from '@/state/slices/actionSlice/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const TCY_TOAST_ID = 'tcyClaimAlert'

export const useTcyClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useNotificationToast()
  const navigate = useNavigate()
  const {
    state: { walletInfo },
  } = useWallet()

  const allTcyClaims = useTCYClaims('all')
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)
  const hasWalletSeenTcyClaimAlert = useAppSelector(
    preferences.selectors.selectHasWalletSeenTcyClaimAlert,
  )

  useEffect(() => {
    if (!allTcyClaims.length) return
    const now = Date.now()

    const allClaims = allTcyClaims.map(queryResult => queryResult.data).flat()

    allClaims.forEach(claim => {
      const maybeStoreAction = actions[claim.accountId]

      // A claim in flight or already claimed shares this action, leave it to the claim flow
      if (
        maybeStoreAction &&
        isTcyClaimAction(maybeStoreAction) &&
        (maybeStoreAction.status === ActionStatus.Pending ||
          maybeStoreAction.status === ActionStatus.Claimed)
      )
        return

      // If this claim is already available and still available, no-op
      if (
        maybeStoreAction &&
        isTcyClaimAction(maybeStoreAction) &&
        maybeStoreAction.status === ActionStatus.ClaimAvailable
      ) {
        if (
          walletInfo &&
          !hasWalletSeenTcyClaimAlert[walletInfo.deviceId] &&
          !toast.isActive(TCY_TOAST_ID) // Just in case redux takes too much time to update
        ) {
          dispatch(preferences.actions.setHasSeenTcyClaimForWallet(walletInfo.deviceId))

          toast({
            render: ({ onClose }) => {
              const handleClick = () => {
                navigate('/tcy')
                onClose()
              }

              return <TcyClaimSaversNotification handleClick={handleClick} onClose={onClose} />
            },
            id: TCY_TOAST_ID,
            duration: null,
            isClosable: true,
          })
        }
        return
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: claim.accountId,
          status: ActionStatus.ClaimAvailable,
          type: ActionType.TcyClaim,
          createdAt: now,
          updatedAt: now,
          tcyClaimActionMetadata: {
            claim,
          },
        }),
      )
    })
  }, [
    allTcyClaims,
    dispatch,
    actionIds,
    actions,
    walletInfo,
    hasWalletSeenTcyClaimAlert,
    toast,
    navigate,
  ])

  // Resolves sent claims even after leaving the claim status page, sharing its status query
  const pendingClaimActions = useMemo(
    () =>
      Object.values(actions)
        .filter(isTcyClaimAction)
        .filter(
          action =>
            action.status === ActionStatus.Pending && Boolean(action.tcyClaimActionMetadata.txHash),
        ),
    [actions],
  )

  const claimTxStatuses = useQueries({
    queries: pendingClaimActions.map(action => {
      const txHash = action.tcyClaimActionMetadata.txHash ?? ''

      return {
        queryKey: ['getThorchainTransactionStatus', txHash],
        queryFn: () => getThorchainTransactionStatus({ txHash, skipOutbound: true }),
        refetchInterval: 10_000,
      }
    }),
  })

  const claimTxStatusKey = claimTxStatuses.map(({ data }) => data).join()

  useEffect(() => {
    pendingClaimActions.forEach((action, i) => {
      switch (claimTxStatuses[i]?.data) {
        case TxStatus.Confirmed:
          dispatch(actionSlice.actions.upsertAction({ ...action, status: ActionStatus.Claimed }))
          queryClient.invalidateQueries({
            queryKey: ['tcy-claims', action.tcyClaimActionMetadata.claim.accountId],
          })
          return
        case TxStatus.Failed:
          dispatch(
            actionSlice.actions.upsertAction({
              ...action,
              status: ActionStatus.ClaimAvailable,
              tcyClaimActionMetadata: { claim: action.tcyClaimActionMetadata.claim },
            }),
          )
          return
        default:
          return
      }
    })
    // claimTxStatuses is recreated on every render, use its statuses for a stable reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, pendingClaimActions, claimTxStatusKey, queryClient])
}
