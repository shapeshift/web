import { getConfig } from 'config'
import Mixpanel from 'mixpanel-browser'

type MixPanelType = typeof Mixpanel | null
// don't export me, access me through the getter
let _mixPanel: MixPanelType | undefined = undefined

// we need to be able to access this outside react
export const getMixPanel = (): MixPanelType => {
  if (_mixPanel) return _mixPanel
  const mixPanelEnabled = getConfig().REACT_APP_FEATURE_MIXPANEL
  if (!mixPanelEnabled) return null
  Mixpanel.init(getConfig().REACT_APP_MIXPANEL_TOKEN)
  _mixPanel = Mixpanel
  return _mixPanel
}
