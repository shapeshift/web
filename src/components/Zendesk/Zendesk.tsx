import './zendesk.css'

import { getConfig } from 'config'
import { useCallback, useEffect } from 'react'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['Zendesk'] })

// https://support.zendesk.com/hc/en-us/articles/4500748175258
export const Zendesk = () => {
  const zendeskKey = getConfig().REACT_APP_ZENDESK_KEY

  const onload = useCallback(() => {
    const categories = [
      '4415365689869-About-the-ShapeShift-DAO', // https://shapeshift.zendesk.com/hc/en-us/categories/4415365689869-About-the-ShapeShift-DAO
      '4415372594061-Buy-Crypto', // https://shapeshift.zendesk.com/hc/en-us/categories/4415372594061-Buy-Crypto
    ]
    const sections = [
      '4415697102221-Staking', // https://shapeshift.zendesk.com/hc/en-us/sections/4415697102221-Staking
      '4421490295437-app-shapeshift-com', // https://shapeshift.zendesk.com/hc/en-us/sections/4421490295437-app-shapeshift-com
    ]

    const settings = {
      webWidget: {
        // https://developer.zendesk.com/api-reference/widget/core/#launcher
        launcher: {
          // https://developer.zendesk.com/api-reference/widget/settings/#labelvisible
          mobile: {
            labelVisible: false,
          },
          // https://support.zendesk.com/hc/en-us/articles/4408832257562-Advanced-customization-of-Web-Widget-Classic-#topic_chz_bbq_mx
          label: {
            /**
             * key of '*' is a wildcard for all languages
             * value is a zero-width space replacing 'Support' label, empty string doesn't work
             */
            '*': '\u200B',
          },
          helpCenter: {
            filter: {
              ...(categories ? { category: categories.join(',') } : {}),
              ...(categories ? { section: sections.join(',') } : {}),
            },
          },
        },
      },
    }

    ;(window as any).zE('webWidget', 'updateSettings', settings)
  }, [])

  useEffect(() => {
    // key is not set for private, is set for app
    if (!zendeskKey) return
    // paranoia check
    if (window.location.hostname.includes('private.shapeshift.com')) {
      moduleLogger.error(null, 'Zendesk key is set on wrong environment, change this immediately!')
      return
    }

    const scriptId = 'ze-snippet'
    const maybeScript = document.getElementById(scriptId)
    if (maybeScript) return // don't add multiple copies

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${zendeskKey}`
    script.onload = onload
    document.head.appendChild(script)
  }, [zendeskKey, onload])

  return null
}
