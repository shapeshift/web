import { useToast } from '@chakra-ui/react'
import stringify from 'fast-json-stable-stringify'
import { useEffect, useMemo } from 'react'

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

export const useAppUpdateActionSubscriber = ({
  isDrawerOpen,
  onDrawerOpen,
}: UseAppUpdateActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const { hasUpdated, newMetadata, initialMetadata } = useHasAppUpdated()

  console.log({ newMetadata, initialMetadata, hasUpdated })

  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)

  const toast = useToast({
    position: 'bottom-right',
    duration: isDrawerOpen ? 5000 : null,
  })

  const currentVersionId = useMemo(
    () => (initialMetadata ? getAppUpdateId(initialMetadata) : undefined),
    [initialMetadata],
  )

  const currentVersionExistingAction = currentVersionId ? actionsById[currentVersionId] : undefined

  // Check for a new version and add an action + pop a toast if there is
  useEffect(() => {
    if (currentVersionExistingAction === undefined && currentVersionId !== undefined) {
      // Create the app update action
      dispatch(
        actionSlice.actions.upsertAction({
          id: currentVersionId,
          type: ActionType.AppUpdate,
          status: ActionStatus.Complete,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          appUpdateMetadata: {},
        }),
      )

      toast({
        render: props => <AppUpdateNotification handleClick={onDrawerOpen} {...props} />,
      })
    }
  }, [
    dispatch,
    onDrawerOpen,
    toast,
    hasUpdated,
    newMetadata,
    currentVersionExistingAction,
    currentVersionId,
  ])

  // Delete any app update actions that are not relevant to our current version
  useEffect(() => {
    if (currentVersionId === undefined) return
    Object.values(actionsById).forEach(({ id, type }) => {
      if (type === ActionType.AppUpdate && id !== currentVersionId) {
        dispatch(actionSlice.actions.deleteAction(id))
      }
    })
  }, [dispatch, onDrawerOpen, toast, hasUpdated, newMetadata, actionsById, currentVersionId])
}
