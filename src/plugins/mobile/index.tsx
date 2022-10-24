import type { Plugins } from 'plugins/types'
import { isMobile } from 'lib/globals'
import { logger } from 'lib/logger'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

const moduleLogger = logger.child({ namespace: ['Plugins', 'Mobile'] })

export type MobileMessageEvent = { id: number; cmd?: string; deviceId?: string }

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'mobileAppPlugin',
      {
        name: 'Mobile App Plugin',
        onLoad: () => {
          // Only listen to mobile events if we're running in the mobile app
          if (isMobile) {
            const eventListener = (e: MessageEvent<MobileMessageEvent>) => {
              moduleLogger.trace({ event: e.data }, 'PostMessage Event')

              if (e.data?.cmd === 'walletImported' && e.data?.deviceId) {
                moduleLogger.debug({ event: e.data }, 'Wallet Import message received')
                // Set the welcome modal to true once the wallet has been imported on mobile
                store.dispatch(preferences.actions.setWelcomeModal({ show: true }))
              }

              // ------------ WARNING ------------
              // The PING command is a way for the mobile app to verify that the WebView is loaded
              // and responding. If there is no PONG response, the mobile app will reload the page
              // Removing or disabling this will cause the mobile to reload constantly
              if (e.data?.cmd === 'ping') {
                moduleLogger.trace({ event: e.data }, 'Sending "pong" response')
                window.ReactNativeWebView?.postMessage(
                  JSON.stringify({
                    id: e.data.id,
                    cmd: 'pong',
                  }),
                )
              }
            }

            window.addEventListener('message', eventListener)
          }
        },
      },
    ],
  ]
}
