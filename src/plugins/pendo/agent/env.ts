import memoize from 'lodash/memoize'
import { logger } from 'lib/logger'

import { expectedResponseKeys } from './filters'
import { makeStorageWrapper } from './storage'
import type { Pendo, PendoConfig, PendoEnv } from './types'

const MAX_LOG_LENGTH = 1024

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'Agent', 'Env'] })

export function createTransmissionLog(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const push = out.push.bind(out)
  out.push = x => {
    push(x)
    while (out.length > MAX_LOG_LENGTH) out.shift()
    return out.length
  }

  return out
}

export function makePendoEnv(pendoConfig: PendoConfig): PendoEnv {
  // This is the standard agent stub usually set up by the snippet.
  const pendo: Pendo = {
    _q: [] as unknown[],
    initialize(...args: unknown[]) {
      pendo._q.unshift(['initialize', ...args])
    },
    identify(...args: unknown[]) {
      pendo._q.push(['identify', ...args])
    },
    updateOptions(...args: unknown[]) {
      pendo._q.push(['updateOptions', ...args])
    },
    pageLoad(...args: unknown[]) {
      pendo._q.push(['pageLoad', ...args])
    },
    track(...args: unknown[]) {
      pendo._q.push(['track', ...args])
    },
  }

  const compressMap = new Map<string, object>()
  const [cookieStorage, cookieStorageWrapper] = makeStorageWrapper()
  const [localStorage, localStorageWrapper] = makeStorageWrapper({
    'log-enabled': true,
  })
  const [sessionStorage, sessionStorageWrapper] = makeStorageWrapper()
  const transmissionLog = createTransmissionLog()

  let unsealed = false

  return {
    PendoConfig: pendoConfig,
    pendo,
    expectedResponseKeys,
    compressMap,
    transmissionLog,
    cookieStorageWrapper,
    localStorageWrapper,
    sessionStorageWrapper,
    cookieStorage,
    localStorage,
    sessionStorage,
    get sealed() {
      return !unsealed
    },
    unseal: memoize(() => {
      // This warning is help make sure we don't accidentally remove security
      // protections in production
      const warning = `**PENDO WARNING**
      
      Many security protections are now disabled.
      
      If this is a production environment, please fix the environment variables IMMEDIATELY`
      moduleLogger.warn(new Error(warning), 'Warning')
      alert(warning)
      unsealed = true
    }),
  }
}
