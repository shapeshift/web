import { useToast } from '@chakra-ui/react'
import stringify from 'fast-json-stable-stringify'
import { useEffect } from 'react'

import type { Metadata } from '../useHasAppUpdated/useHasAppUpdated'
import { useHasAppUpdated } from '../useHasAppUpdated/useHasAppUpdated'

import { AppUpdateNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/AppUpdateNotification'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UseAppUpdateActionSubscriberProps = {
  onDrawerOpen: () => void
  isDrawerOpen: boolean
}

const getAppUpdateId = (meta: Metadata) => stringify(meta)

const APP_UPDATE_ACTION_ID = 'app-update-2'

export const useAppUpdateActionSubscriber = ({
  isDrawerOpen,
  onDrawerOpen,
}: UseAppUpdateActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const { hasUpdated, newMetadata } = useHasAppUpdated()

  const toast = useToast({
    position: 'bottom-right',
    duration: isDrawerOpen ? 5000 : null,
  })

  // Check if we already have an app update action to prevent duplicates
  const existingAction = useAppSelector(state => state.action.byId[APP_UPDATE_ACTION_ID])

  useEffect(() => {
    if (hasUpdated && !existingAction && newMetadata !== undefined) {
      // Create the app update action
      dispatch(
        actionSlice.actions.upsertAction({
          id: getAppUpdateId(newMetadata),
          type: ActionType.AppUpdate,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          appUpdateMetadata: {},
        }),
      )

      toast({
        render: props => <AppUpdateNotification handleClick={onDrawerOpen} {...props} />,
      })
    }
  }, [existingAction, dispatch, onDrawerOpen, toast, hasUpdated, newMetadata])
}
