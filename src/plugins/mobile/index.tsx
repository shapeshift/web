import type { Plugins } from 'plugins/types'
import { isMobile } from 'lib/globals'

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
              // ------------ WARNING ------------
              // The PING command is a way for the mobile app to verify that the WebView is loaded
              // and responding. If there is no PONG response, the mobile app will reload the page
              // Removing or disabling this will cause the mobile to reload constantly
              if (e.data?.cmd === 'ping') {
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
