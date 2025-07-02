import { useToast } from '@chakra-ui/react'
import stringify from 'fast-json-stable-stringify'
import { useEffect, useMemo, useRef } from 'react'

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
  const { hasUpdated, initialMetadata } = useHasAppUpdated()
  const hasShownToast = useRef(false)

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
    if (
      currentVersionExistingAction === undefined &&
      currentVersionId !== undefined &&
      hasUpdated
    ) {
      // Create the app update action
      dispatch(
        actionSlice.actions.upsertAction({
          id: currentVersionId,
          type: ActionType.AppUpdate,
          status: ActionStatus.Complete,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          appUpdateMetadata: {
            currentVersion: currentVersionId,
          },
        }),
      )

      // this ensures we don't accidentally double toast if this runs twice due to some reference update while hasUpdated = true and currentVersionExistingAction = undefined
      if (!hasShownToast.current) {
        toast({
          render: props => <AppUpdateNotification handleClick={onDrawerOpen} {...props} />,
        })

        hasShownToast.current = true
      }
    }
  }, [dispatch, onDrawerOpen, toast, hasUpdated, currentVersionExistingAction, currentVersionId])

  // Delete any app update actions that are not relevant to our current version
  useEffect(() => {
    if (currentVersionId === undefined) return
    Object.values(actionsById).forEach(({ id, type }) => {
      if (type === ActionType.AppUpdate && id !== currentVersionId) {
        dispatch(actionSlice.actions.deleteAction(id))
      }
    })
  }, [dispatch, onDrawerOpen, toast, hasUpdated, actionsById, currentVersionId])
}
