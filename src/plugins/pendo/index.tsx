import { getConfig } from 'config'
import { Plugins } from 'plugins'
import { logger } from 'lib/logger'

import { OptInIcon } from './components/OptInModal/OptInIcon'
import { OptInModal } from './components/OptInModal/OptInModal'
import { makePendoLauncher } from './launcher'
import { VisitorDataManager } from './visitorData'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo'] })

async function launch() {
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
    htmlAttributes: /^(tabindex)$/,
    apiKey: config.REACT_APP_PENDO_API_KEY,
  })
  //TODO: This is a very low-priority task; experiment with delays here if
  // any appreciable contention for execution time is observed
  setTimeout(() => launcher.arm(), 0)
  VisitorDataManager.consent(`optOut_${config.REACT_APP_PENDO_CONSENT_VERSION}`)
    .then(async () => {
      moduleLogger.info('user opted-out; TBD redirect now')
    })
    .catch(e => moduleLogger.error(e, { fn: 'launch' }, 'opt-out error'))

  try {
    await VisitorDataManager.consent(
      `optIn_${config.REACT_APP_PENDO_CONSENT_VERSION}`,
      async () => {
        //TODO: remove this hack once consent UI is available
        // eslint-disable-next-line no-restricted-globals
        if (confirm('pendo consent?')) {
          VisitorDataManager.recordConsent(`optIn_${config.REACT_APP_PENDO_CONSENT_VERSION}`)
        } else {
          VisitorDataManager.recordConsent(`outOut_${config.REACT_APP_PENDO_CONSENT_VERSION}`)
        }
      },
    )
  } catch (e) {
    moduleLogger.error(e, { fn: 'launch' }, 'consent error')
    return
  }

  launcher.launch(config.REACT_APP_PENDO_VISITOR_ID_PREFIX)
}

export function register(): Plugins {
  return [
    [
      'pendoAnalytics',
      {
        name: 'pendoAnalytics',
        featureFlag: 'Pendo',
        icon: <OptInIcon />,
        onLoad: () =>
          launch().catch(e => moduleLogger.error(e, { fn: 'register' }, 'Pendo launch error')),
        routes: [
          {
            path: '/consent',
            hide: true,
            label: 'navBar.consent',
            main: () => <OptInModal isOpen={true} close={() => logger.debug('modal closed')} />,
            icon: <OptInIcon />,
          },
        ],
      },
    ],
  ]
}
