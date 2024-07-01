import type { SDKConfig } from '@lifi/sdk'
import { config } from '@lifi/sdk'

import { LIFI_INTEGRATOR_ID } from './constants'

// Mandatory to pass the configuration object
const lifiConfig: SDKConfig = {
  disableVersionCheck: true, // prevent console fetching and notifying client about updates
  integrator: LIFI_INTEGRATOR_ID,
}

// Configure LiFi SDK as a singleton, i.e in case it hasn't been already
export const configureLiFi = () => {
  config.set(lifiConfig)
}
