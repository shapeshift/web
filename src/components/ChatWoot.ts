import type React from 'react'
import { useEffect } from 'react'

import { getConfig } from '@/config'

export const ChatwootWidget: React.FC = () => {
  const chatwootEnabled = import.meta.env.VITE_FEATURE_CHATWOOT === 'true'
  useEffect(() => {
    if (!chatwootEnabled) return // Add Chatwoot Settings
    const BASE_URL = getConfig().VITE_CHATWOOT_URL
    let allowedOrigin = ''
    try {
      allowedOrigin = new URL(BASE_URL).origin
    } catch {
      allowedOrigin = ''
    }
    const chatwootMessageGuard = (event: MessageEvent) => {
      const dataString = typeof event.data === 'string' ? event.data : undefined
      if (!dataString || !dataString.startsWith('chatwoot-widget:')) return
      if (!allowedOrigin || event.origin !== allowedOrigin) {
        event.stopImmediatePropagation()
        event.stopPropagation()
        return
      }
      try {
        const payload = JSON.parse(dataString.replace('chatwoot-widget:', '')) as {
          event?: string
          baseUrl?: string
        }
        if (payload?.event === 'popupChatWindow' && typeof payload.baseUrl === 'string') {
          const parsed = new URL(payload.baseUrl, allowedOrigin)
          const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:'
          const isSameOrigin = parsed.origin === allowedOrigin
          if (!isHttp || !isSameOrigin) {
            event.stopImmediatePropagation()
            event.stopPropagation()
          }
        }
      } catch {
        event.stopImmediatePropagation()
        event.stopPropagation()
      }
    }
    window.addEventListener('message', chatwootMessageGuard as EventListener, true)
    ;(window as any).chatwootSettings = {
      hideMessageBubble: true,
      position: 'left', // This can be left or right
      locale: 'en', // Language to be set
      type: 'standard', // [standard, expanded_bubble]
    }

    // Paste the script from inbox settings except the <script> tag
    ;(function (d: Document) {
      const BASE_URL = getConfig().VITE_CHATWOOT_URL
      const g = d.createElement('script')
      const s = d.getElementsByTagName('script')[0]
      g.src = BASE_URL + '/packs/js/sdk.js'
      s.parentNode?.insertBefore(g, s)
      g.async = true
      g.onload = function () {
        ;(window as any).chatwootSDK.run({
          websiteToken: getConfig().VITE_CHATWOOT_TOKEN,
          baseUrl: BASE_URL,
        })
      }
    })(document)
    return () => window.removeEventListener('message', chatwootMessageGuard as EventListener, true)
  }, [chatwootEnabled])

  return null
}
