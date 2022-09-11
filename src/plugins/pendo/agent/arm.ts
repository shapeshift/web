import * as ssri from 'ssri'
import { logger } from 'lib/logger'

import { deferred } from '../utils'
import { fixupTables } from './fixups'
import { parseAgent } from './parse'
import type { PendoEnv, PendoInitializeParams, Window } from './types'

declare const window: Window & typeof globalThis

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent', 'Arm'] })

/**
 * Downloads the Pendo agent, applies fixups to make it safe, and then loads it
 * into the document. This will initiate a (potentially cached) request to Pendo
 * servers for the agent and start to run the returned code, but the agent will
 * not start transmitting telemetry or load guides until initialized.
 * @returns A Promise for an initializer function, which will initialize the
 * agent, start transmitting telemetry, and load guides. The initializer takes a
 * visitor ID string as a parameter. (This is a one-shot thing; repeated calls
 * will not change the visitor ID.)
 */
export function armPendoAgent(
  pendoEnv: PendoEnv,
  pendoInitializeParams: Omit<PendoInitializeParams, 'visitor'>,
): (x: string | Promise<string>) => void {
  const pendo = pendoEnv.pendo
  const pendoConfig = pendoEnv.PendoConfig

  Object.defineProperty(window, 'pendo', {
    enumerable: true,
    get() {
      return pendo
    },
    set(value: unknown) {
      if (value !== pendo) throw new Error('overwriting window.pendo is not allowed')
    },
  })
  Object.defineProperty(window, 'pendoEnv', {
    enumerable: true,
    get() {
      return pendoEnv
    },
    set(value: unknown) {
      if (value !== pendoEnv) throw new Error('overwriting window.pendoEnv is not allowed')
    },
  })

  const [agentReadyPromise, agentReadyResolver, agentReadyRejector] = deferred<void>()
  const [initializePromise, initializeResolver] = deferred<string>()

  Promise.all([initializePromise, agentReadyPromise])
    .then(async ([x]) =>
      pendo.initialize({
        ...(x ? { visitor: { id: x } } : {}),
        ...pendoInitializeParams,
        ...pendoConfig,
      }),
    )
    .catch(e => moduleLogger.error(e, 'error initializing'))
  ;(async () => {
    const agentUrl = `https://cdn.pendo.io/agent/static/${pendoConfig.apiKey}/pendo.js`
    moduleLogger.trace({ fn: 'armPendoAgent', agentUrl }, 'fetching agent')
    const agentSrc = await (
      await fetch(agentUrl, {
        credentials: 'omit',
      })
    ).text()
    const agentIntegrity = (await ssri.fromData(agentSrc, { algorithms: ['sha256'] })).toString()
    moduleLogger.trace({ fn: 'armPendoAgent', agentIntegrity }, 'parsing agent')
    const parsedAgent = await parseAgent(agentSrc, pendoConfig, fixupTables)
    pendoEnv.PendoConfig = parsedAgent.PendoConfig
    Object.freeze(pendoEnv)

    const pendoFixupHelpers = parsedAgent.makeFixupHelpers(pendoEnv)
    Object.defineProperty(window, 'pendoFixupHelpers', {
      enumerable: true,
      get() {
        return pendoFixupHelpers
      },
      set(value: unknown) {
        if (value !== pendoFixupHelpers) {
          throw new Error('overwriting window.pendoFixupHelpers is not allowed')
        }
      },
    })

    moduleLogger.trace(
      {
        fn: 'armPendoAgent',
        parsedAgentIntegrity: parsedAgent.integrity,
        PendoConfig: pendoEnv.PendoConfig,
      },
      'loading parsed agent',
    )

    const agentScriptNode = document.createElement('script')
    agentScriptNode.async = true
    agentScriptNode.src = parsedAgent.src
    agentScriptNode.integrity = parsedAgent.integrity
    agentScriptNode.crossOrigin = 'anonymous'
    document.body.appendChild(agentScriptNode)
  })().then(
    () => agentReadyResolver(),
    e => {
      moduleLogger.error(e, `error loading agent`)
      agentReadyRejector(e)
    },
  )

  return initializeResolver
}
