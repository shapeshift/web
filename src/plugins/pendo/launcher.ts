import { getConfig } from 'config'
import { isMobile as isMobileApp } from 'lib/globals'
import { logger } from 'lib/logger'

import type { PendoConfig, PendoEnv, PendoInitializeParams } from './agent'
import { armPendoAgent } from './agent'
import { makePendoEnv } from './agent/env'
import { sanitizeUrl } from './sanitizeUrl'
import type { PendoLauncher } from './types'
import { deferred } from './utils'
import { VisitorDataManager } from './visitorData'

const moduleLogger = logger.child({ namespace: ['Plugins', 'Pendo', 'Launcher'] })
const pendoEventsLogger = logger.child({ namespace: ['Plugins', 'Pendo', 'Events'] })

/**
 * sanitizeUrl, validateLauncher, and validateGlobalScript are needed here, but
 * the rest are also included for debugging convenience.
 */
const makeBasePendoInitializeParams = (pendoEnv: PendoEnv) => ({
  sanitizeUrl,
  events: {
    ready: () => {
      pendoEventsLogger.trace('ready')
      pendoEnv.pendo.track('visit', { mobile_app: isMobileApp })
      pendoEventsLogger.trace('trackedVisit')
    },
    deliverablesLoaded: () => {
      pendoEventsLogger.trace('deliverablesLoaded')
    },
    guidesFailed: () => {
      pendoEventsLogger.trace('guidesFailed')
    },
    guidesLoaded: () => {
      pendoEventsLogger.trace('guidesLoaded')
    },
    validateGuide: async (signatureString: string) => {
      pendoEventsLogger.trace({ signatureString }, 'validateGuide')
      // Guide validation is provided by the logic in pendo/filters.ts
      return true
    },
    validateLauncher: async (signatureString: string) => {
      pendoEventsLogger.trace({ signatureString }, 'validateLauncher')
      return !pendoEnv.sealed
    },
    validateGlobalScript: async (data: unknown) => {
      pendoEventsLogger.trace({ data }, 'validateGlobalScript')
      return !pendoEnv.sealed
    },
  },
})

/**
 * Makes the hooks object that should be exposed to the consent plugin.
 */
export function makePendoLauncher(
  pendoConfig: PendoConfig,
  pendoInitializeParams?: PendoInitializeParams,
): PendoLauncher {
  let pendoEnv: PendoEnv | undefined = undefined

  const [armAgentPromise, armAgentResolver] = deferred<void>()
  const agentInitializerPromise = armAgentPromise.then(() => {
    moduleLogger.debug({ fn: 'makePendoLauncher' }, 'arming agent')
    pendoEnv = makePendoEnv(pendoConfig)
    if (getConfig().REACT_APP_PENDO_UNSAFE_DESIGNER_MODE) pendoEnv.unseal()
    return armPendoAgent(pendoEnv, {
      ...makeBasePendoInitializeParams(pendoEnv),
      ...(pendoInitializeParams ?? {}),
    })
  })

  const [launchAuthorizationPromise, launchAuthorizationResolver] = deferred<string | undefined>()

  agentInitializerPromise
    .then(async initialize => {
      const idPrefix = await launchAuthorizationPromise
      const id = await VisitorDataManager.getId()
      const visitorId = `${idPrefix ? `${idPrefix}_` : ''}${id}`
      moduleLogger.debug({ fn: 'makePendoLauncher' }, 'launching agent')
      initialize(visitorId)
    })
    .catch(e => moduleLogger.error(e, { fn: 'makePendoLauncher' }, 'error initializing agent'))

  return {
    arm() {
      armAgentResolver()
    },
    launch(idPrefix?: string) {
      armAgentResolver()
      launchAuthorizationResolver(idPrefix)
    },
    get transmissionLog() {
      return pendoEnv?.transmissionLog ?? []
    },
  }
}
