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
import { selectPendingTcyClaimActions } from '@/state/slices/actionSlice/selectors'
import {
  ActionStatus,
  ActionType,
  isClaimStatusRegression,
  isTcyClaimAction,
} from '@/state/slices/actionSlice/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const TCY_TOAST_ID = 'tcyClaimAlert'

const selectClaimTxStatuses = (results: { data?: TxStatus }[]) => results.map(({ data }) => data)

export const useTcyClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useNotificationToast()
  const navigate = useNavigate()
  const {
    state: { walletInfo },
  } = useWallet()

  const allTcyClaims = useTCYClaims('all')
  const walletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)
  const hasWalletSeenTcyClaimAlert = useAppSelector(
    preferences.selectors.selectHasWalletSeenTcyClaimAlert,
  )

  useEffect(() => {
    if (!allTcyClaims.length) return
    const now = Date.now()

    const allClaims = allTcyClaims.flatMap(queryResult => queryResult.data ?? [])

    allClaims.forEach(claim => {
      const maybeStoreAction = actions[claim.accountId]

      // A claim in flight or already claimed shares this action, leave it to the claim flow
      if (
        maybeStoreAction &&
        isTcyClaimAction(maybeStoreAction) &&
        isClaimStatusRegression(maybeStoreAction.status, ActionStatus.ClaimAvailable)
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

  // A claimable account missing from its fresh read was claimed elsewhere, an unknown read is left alone
  useEffect(() => {
    allTcyClaims.forEach((queryResult, i) => {
      if (!queryResult.data) return

      // Queries are keyed in wallet account order, see useTCYClaims('all')
      const accountId = walletAccountIds[i]
      const action = actions[accountId]
      if (!action || !isTcyClaimAction(action)) return
      if (action.status !== ActionStatus.ClaimAvailable) return

      const { asset, l1_address } = action.tcyClaimActionMetadata.claim
      if (queryResult.data.some(claim => claim.asset === asset && claim.l1_address === l1_address))
        return

      dispatch(actionSlice.actions.deleteAction(action.id))
    })
    // Only react to fresh reads, not to our own deletes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTcyClaims, walletAccountIds, dispatch])

  // Resolves sent claims even after leaving the claim status page, sharing its status query
  const pendingTcyClaimActions = useAppSelector(selectPendingTcyClaimActions)
  const pendingClaimActions = useMemo(
    () => pendingTcyClaimActions.filter(action => Boolean(action.tcyClaimActionMetadata.txHash)),
    [pendingTcyClaimActions],
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
    combine: selectClaimTxStatuses,
  })

  useEffect(() => {
    pendingClaimActions.forEach((action, i) => {
      switch (claimTxStatuses[i]) {
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
  }, [dispatch, pendingClaimActions, claimTxStatuses, queryClient])
}
