import type React from 'react'
import { useEffect } from 'react'

export const ChatwootWidget: React.FC = () => {
  useEffect(() => {
    // Add Chatwoot Settings
    ;(window as any).chatwootSettings = {
      hideMessageBubble: true,
      position: 'left', // This can be left or right
      locale: 'en', // Language to be set
      type: 'standard', // [standard, expanded_bubble]
    }

    // Paste the script from inbox settings except the <script> tag
    ;(function (d: Document, t: string) {
      const BASE_URL = 'https://app.chatwoot.com/'
      const g = d.createElement(t)
      const s = d.getElementsByTagName(t)[0]
      // @ts-ignore
      g.src = BASE_URL + '/packs/js/sdk.js'
      s.parentNode?.insertBefore(g, s)
      // @ts-ignore
      g.async = true
      g.onload = function () {
        ;(window as any).chatwootSDK.run({
          websiteToken: 'jmoXp9BPMSPEYHeJX5YKT15Q',
          baseUrl: BASE_URL,
        })
      }
    })(document, 'script')
  }, [])

  return null
}
