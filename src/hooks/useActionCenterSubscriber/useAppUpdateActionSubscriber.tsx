import { useToast } from '@chakra-ui/react'
import stringify from 'fast-json-stable-stringify'
import { unescape } from 'lodash'
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

  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)

  const toast = useToast({
    position: 'bottom-right',
    duration: isDrawerOpen ? 5000 : null,
  })

  const newVersionId = useMemo(
    () => (newMetadata ? getAppUpdateId(newMetadata) : undefined),
    [newMetadata],
  )
  const currentVersionId = useMemo(
    () => (initialMetadata ? getAppUpdateId(initialMetadata) : undefined),
    [initialMetadata],
  )

  const newVersionExistingAction = newVersionId ? actionsById[newVersionId] : undefined
  const currentVersionExistingAction = currentVersionId ? actionsById[currentVersionId] : undefined

  // TODO properly test this logic with actual versions. Doing whacko stuff on local
  useEffect(() => {
    if (
      currentVersionExistingAction !== undefined &&
      currentVersionId !== undefined &&
      currentVersionExistingAction.status === ActionStatus.Pending
    ) {
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
    }
  }, [
    dispatch,
    onDrawerOpen,
    toast,
    hasUpdated,
    newMetadata,
    newVersionExistingAction,
    currentVersionExistingAction,
    currentVersionId,
  ])

  useEffect(() => {
    if (
      hasUpdated &&
      newVersionExistingAction === undefined &&
      newMetadata !== undefined &&
      newVersionId !== undefined
    ) {
      // Create the app update action
      dispatch(
        actionSlice.actions.upsertAction({
          id: newVersionId,
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
  }, [
    dispatch,
    onDrawerOpen,
    toast,
    hasUpdated,
    newMetadata,
    newVersionExistingAction,
    newVersionId,
  ])
}
