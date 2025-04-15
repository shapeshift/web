import type React from 'react'
import { useEffect } from 'react'

import { getConfig } from '@/config'

export const ChatwootWidget: React.FC = () => {
  const chatwootEnabled = import.meta.env.VITE_FEATURE_CHATWOOT === 'true'
  useEffect(() => {
    if (!chatwootEnabled) return // Add Chatwoot Settings
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
  }, [chatwootEnabled])

  return null
}
