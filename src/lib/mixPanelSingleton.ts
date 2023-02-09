import { getConfig } from 'config'
import Mixpanel from 'mixpanel-browser'

type MixPanelType = typeof Mixpanel
// don't export me, access me through the getter
let _mixPanel: MixPanelType | undefined = undefined

// we need to be able to access this outside react
export const getMixPanel = (): MixPanelType => {
  if (_mixPanel) return _mixPanel
  Mixpanel.init(getConfig().REACT_APP_MIXPANEL_TOKEN, { opt_out_tracking_by_default: true })
  _mixPanel = Mixpanel
  return _mixPanel
}
