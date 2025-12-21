// Temporary file to trigger app update notification for debugging
// Run this in browser console: window.triggerAppUpdate()

import { actionSlice } from './state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from './state/slices/actionSlice/types'
import { store } from './state/store'

export const triggerAppUpdate = () => {
  console.log('Triggering app update notification...')

  store.dispatch(
    actionSlice.actions.upsertAction({
      id: 'debug-app-update-' + Date.now(),
      type: ActionType.AppUpdate,
      status: ActionStatus.Complete,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      appUpdateMetadata: {
        currentVersion: 'debug-version',
      },
    }),
  )

  console.log('App update notification triggered! Check ActionCenter.')
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  ;(window as any).triggerAppUpdate = triggerAppUpdate
}
