import './zendesk.css'

import { getConfig } from 'config'
import { useCallback, useEffect } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['Zendesk'] })

// https://support.zendesk.com/hc/en-us/articles/4500748175258
export const Zendesk = () => {
  const isZendeskEnabled = useFeatureFlag('Zendesk')
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

    /**
     * in the future, if we use zendesk, we can add an additional effect that reacts on
     * route changes to dynamically update the help center filter
     */
    ;(window as any).zE('webWidget', 'updateSettings', settings)
  }, [])

  useEffect(() => {
    if (!isZendeskEnabled) return
    // paranoia check
    if (window.location.hostname.includes('private.shapeshift.com')) {
      const err = 'Zendesk is enabled on wrong environment, change this immediately!'
      moduleLogger.error(null, err)
      throw new Error(err)
    }

    const scriptId = 'ze-snippet'
    const maybeScript = document.getElementById(scriptId)
    if (maybeScript) return // don't add multiple copies

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${zendeskKey}`
    script.onload = onload

    /**
     * zendesk doesn't expect us to use a zero-width space for the icon label
     * and leaves leftover padding on the icon, and css doesn't apply to an iframe
     * so we monkey patch the iframe to remove the padding. round buttons are nice.
     */
    const SIXTY_FPS = 1000 / 60 // run this at 60fps to avoid a flicker if possible
    const id = setInterval(() => {
      const maybeIframe = document.getElementById('launcher')
      if (!maybeIframe) return
      const iframe: HTMLIFrameElement = maybeIframe as HTMLIFrameElement
      const icon = iframe.contentDocument?.querySelector<HTMLSpanElement>(
        'span[data-testid="Icon"]',
      )
      const button = iframe.contentDocument?.querySelector<HTMLButtonElement>(
        'button[data-testid="launcher"]',
      )
      if (icon && button) {
        // monkey patch css of icon because of zero-width space to avoid lopsided icon
        icon.style.paddingRight = '0'
        button.style.paddingRight = '0.92857rem'
        button.style.paddingLeft = '0.92857rem'
        moduleLogger.trace('Zendesk icon monkey styled')
        clearInterval(id)
      }
    }, SIXTY_FPS)

    // everything is setup, add the script
    document.head.appendChild(script)
  }, [isZendeskEnabled, zendeskKey, onload])

  return null
}
