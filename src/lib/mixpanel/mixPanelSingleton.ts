import Mixpanel from 'mixpanel-browser'

import type { MixPanelType } from './types'

// don't export me, access me through the getter
let _mixPanel: typeof Mixpanel | undefined = undefined

// we need to be able to access this outside react
export const getMixPanel = (): MixPanelType | undefined => {
  const mixPanelEnabled = import.meta.env.VITE_FEATURE_MIXPANEL === 'true'

  if (!mixPanelEnabled) return
  if (_mixPanel) return _mixPanel

  const token = import.meta.env.VITE_MIXPANEL_TOKEN
  // This should not happen if we're in an env where Mixpanel is enabled, but required for TS to narrow things down
  if (!token) {
    throw new Error('VITE_MIXPANEL_TOKEN is undefined')
  }

  try {
    Mixpanel.init(token, {
      autocapture: {
        pageview: 'url-with-path',
        click: true,
        input: true,
        scroll: false,
        submit: true,
        capture_text_content: false,
      },
      record_sessions_percent: 1,
    })
    _mixPanel = Mixpanel
    // identify once per session
    _mixPanel.identify()
    return _mixPanel
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error)
    return undefined
  }
}
