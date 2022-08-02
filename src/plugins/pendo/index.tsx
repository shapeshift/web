import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { VisitorDataManager } from 'plugins/pendo/visitorData'
import { type Plugins } from 'plugins/types'
import { logger } from 'lib/logger'

import { OptInIcon } from './components/OptInModal/OptInIcon'
import { makePendoLauncher } from './launcher'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo'] })

export const launch = memoize(() => {
  const config = getConfig()

  moduleLogger.trace({ config }, 'launch')
  /**
   * This is mostly recapitulation of settings already provided with the agent,
   * but these are the security-critical bits that need to be enforced.
   */
  const launcher = makePendoLauncher({
    blockAgentMetadata: false, // TODO: double-check
    blockLogRemoteAddress: true, // This doesn't do anything in the current agent version, but the server sets it anyway
    dataHost: 'data.pendo.io',
    allowedOriginServers: [
      `https://pendo-static-${config.REACT_APP_PENDO_SUB_ID}.storage.googleapis.com`,
    ],
    allowCrossOriginFrames: false,
    disableCookies: false, // Safe b/c we're remapping to pendoEnv.cookieStorage
    disableGlobalCSS: true,
    disablePersistence: false, // Safe b/c we're remapping all storage accesses
    excludeAllText: true,
    guideValidation: true,
    localStorageOnly: false, // Safe b/c we're remapping to pendoEnv.localStorage
    preventCodeInjection: true,
    requireHTTPS: true,
    restrictP1Access: true,
    xhrTimings: false,
    xhrWhitelist: null,
    htmlAttributeBlacklist: null,
    htmlAttributes: /^(tabindex|data-test)$/,
    apiKey: config.REACT_APP_PENDO_API_KEY,
  })

  launcher.launch(config.REACT_APP_PENDO_VISITOR_ID_PREFIX)
})

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'pendoAnalytics',
      {
        name: 'pendoAnalytics',
        featureFlag: 'Pendo',
        icon: <OptInIcon />,
        onLoad: () => VisitorDataManager.load(),
      },
    ],
  ]
}
