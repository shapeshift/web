import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { useTCYClaims } from '../queries/useTcyClaims'

import { TcyClaimSaversNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/TcyClaimSaversNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType, isTcyClaimAction } from '@/state/slices/actionSlice/types'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const TCY_TOAST_ID = 'tcyClaimAlert'

export const useTcyClaimActionSubscriber = () => {
  const dispatch = useAppDispatch()
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

              // eslint-disable-next-line react-memo/require-usememo
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
}
