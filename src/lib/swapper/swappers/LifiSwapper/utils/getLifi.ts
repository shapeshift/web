import type { ConfigUpdate } from '@lifi/sdk'
import { LiFi } from '@lifi/sdk'

import { LIFI_INTEGRATOR_ID } from './constants'

// don't export me, access me through the getter
let _lifi: LiFi | null = null

// Mandatory to pass the configuration object
const lifiConfig: ConfigUpdate = {
  disableVersionCheck: true, // prevent console fetching and notifying client about updates
  integrator: LIFI_INTEGRATOR_ID,
}

export const getLifi = (): LiFi => {
  if (_lifi) return _lifi

  // instantiate if it doesn't already exist
  _lifi = new LiFi(lifiConfig)

  return _lifi
}
