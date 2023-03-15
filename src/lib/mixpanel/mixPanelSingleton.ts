import { getConfig } from 'config'
import Mixpanel from 'mixpanel-browser'

import type { MixPanelType } from './types'

// don't export me, access me through the getter
let _mixPanel: typeof Mixpanel | undefined = undefined

// we need to be able to access this outside react
export const getMixPanel = (): MixPanelType => {
  const mixPanelEnabled = getConfig().REACT_APP_FEATURE_MIXPANEL
  if (!mixPanelEnabled) return
  if (_mixPanel) return _mixPanel
  Mixpanel.init(getConfig().REACT_APP_MIXPANEL_TOKEN)
  _mixPanel = Mixpanel
  // identify once per session
  _mixPanel.identify()
  return _mixPanel
}
