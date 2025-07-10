import { useEffect } from 'react'

import { useTCYClaims } from '../queries/useTcyClaims'

import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingTcyClaimActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType, isTcyClaimAction } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useTcyClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()

  const allTcyClaims = useTCYClaims('all')

  const pendingTcyClaimActions = useAppSelector(selectPendingTcyClaimActions)
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)

  useEffect(() => {
    if (!pendingTcyClaimActions.length) return
    const now = Date.now()

    pendingTcyClaimActions.forEach(action => {
      if (!action.tcyClaimActionMetadata.txHash) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: action.id,
          status: ActionStatus.Claimed,
          type: ActionType.TcyClaim,
          createdAt: action.createdAt,
          updatedAt: now,
          tcyClaimActionMetadata: {
            ...action.tcyClaimActionMetadata,
          },
        }),
      )
    })
  }, [pendingTcyClaimActions, dispatch])

  useEffect(() => {
    if (!allTcyClaims.length) return
    const now = Date.now()

    const allClaims = allTcyClaims.map(queryResult => queryResult.data).flat()

    allClaims.forEach(claim => {
      const maybeStoreAction = actions[claim.accountId]

      // If this claim is already available and still available, no-op
      if (
        maybeStoreAction &&
        isTcyClaimAction(maybeStoreAction) &&
        maybeStoreAction.status === ActionStatus.ClaimAvailable
      )
        return

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
    // We definitely don't want to react on assets here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTcyClaims, dispatch, actionIds])
}
