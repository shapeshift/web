import { getConfig } from 'config'
import Mixpanel from 'mixpanel-browser'
import { selectFeatureFlag } from 'state/slices/selectors'
import { store } from 'state/store'

import type { MixPanelType } from './types'

// don't export me, access me through the getter
let _mixPanel: typeof Mixpanel | undefined = undefined

// we need to be able to access this outside react
export const getMixPanel = (): MixPanelType => {
  const mixPanelEnabled = selectFeatureFlag(store.getState(), 'MixPanel')
  if (!mixPanelEnabled) return
  if (_mixPanel) return _mixPanel
  Mixpanel.init(getConfig().REACT_APP_MIXPANEL_TOKEN)
  _mixPanel = Mixpanel
  return _mixPanel
}
