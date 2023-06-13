import { getConfig } from 'config'
import type React from 'react'
import { useEffect } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

export const ChatwootWidget: React.FC = () => {
  const chatWoodEnabled = useFeatureFlag('Chatwoot')
  useEffect(() => {
    if (!chatWoodEnabled) return // Add Chatwoot Settings
    ;(window as any).chatwootSettings = {
      hideMessageBubble: true,
      position: 'left', // This can be left or right
      locale: 'en', // Language to be set
      type: 'standard', // [standard, expanded_bubble]
    }

    // Paste the script from inbox settings except the <script> tag
    ;(function (d: Document) {
      const BASE_URL = getConfig().REACT_APP_CHATWOOT_URL
      const g = d.createElement('script')
      const s = d.getElementsByTagName('script')[0]
      g.src = BASE_URL + '/packs/js/sdk.js'
      s.parentNode?.insertBefore(g, s)
      g.async = true
      g.onload = function () {
        ;(window as any).chatwootSDK.run({
          websiteToken: getConfig().REACT_APP_CHATWOOT_TOKEN,
          baseUrl: BASE_URL,
        })
      }
    })(document)
  }, [chatWoodEnabled])

  return null
}
