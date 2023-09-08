import type { ConfigUpdate } from '@lifi/sdk'
import { LiFi } from '@lifi/sdk'

// don't export me, access me through the getter
let _lifi: LiFi | null = null

// Mandatory to pass the configuration object
const lifiConfig: ConfigUpdate = {
  disableVersionCheck: true, // prevent console fetching and notifying client about updates
  integrator: 'your-integrator-name',
}

export const getLifi = (): LiFi => {
  if (_lifi) return _lifi

  // instantiate if it doesn't already exist
  _lifi = new LiFi(lifiConfig)

  return _lifi
}
