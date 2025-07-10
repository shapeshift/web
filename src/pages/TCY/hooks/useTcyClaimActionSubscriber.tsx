import { useEffect } from 'react'

import { useTCYClaims } from '../queries/useTcyClaims'

import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType, isTcyClaimAction } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useTcyClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()

  const allTcyClaims = useTCYClaims('all')
  const actions = useAppSelector(actionSlice.selectors.selectActionsById)
  const actionIds = useAppSelector(actionSlice.selectors.selectActionIds)

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
  }, [allTcyClaims, dispatch, actionIds, actions])
}
