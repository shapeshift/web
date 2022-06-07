import merge from 'lodash/merge'
import * as runtypes from 'runtypes'
import { logger } from 'lib/logger'

import { deferred } from './utils'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo'] })

export const VisitorId = runtypes.Record({
  id: runtypes.String,
  expiry: runtypes.Number,
})
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type VisitorId = runtypes.Static<typeof VisitorId>

export const VisitorData = runtypes.Record({
  visitorId: VisitorId,
  consent: runtypes.Dictionary(runtypes.Literal(true), runtypes.String),
})
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type VisitorData = runtypes.Static<typeof VisitorData>

export class VisitorDataManager {
  static readonly #consentMap = new Map<
    string,
    [Promise<void>, () => void, (e?: unknown) => void]
  >()

  private constructor() {}

  static #get(): Readonly<Partial<VisitorData>> {
    const raw = window.localStorage.getItem('visitorData')
    try {
      return Object.freeze(VisitorData.asPartial().check(JSON.parse(raw ?? '{}')))
    } catch (e) {
      moduleLogger.error(e, { fn: 'VisitorDataManager.#get', raw }, 'parse error')
      window.localStorage.removeItem('visitorData')
      return Object.freeze({})
    }
  }

  static #update(updates: Partial<VisitorData>) {
    try {
      const data = VisitorData.asPartial().check(merge({}, VisitorDataManager.#get(), updates))
      moduleLogger.trace({ fn: 'VisitorDataManager.#update', data }, 'setting new visitor data')
      window.localStorage.setItem('visitorData', JSON.stringify(data))
    } catch (e) {
      moduleLogger.error(e, { fn: 'VisitorDataManager.#update', updates }, 'update error')
      window.localStorage.removeItem('visitorData')
    }
  }

  static async getId(): Promise<string> {
    const currentVisitorId = VisitorDataManager.#get().visitorId
    if (currentVisitorId && currentVisitorId.expiry < Date.now()) {
      return currentVisitorId.id
    }
    const newVisitorId = {
      id: Buffer.from(await window.crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
      // random 1-2 week timeout
      expiry: Math.floor(Date.now() + (1 + Math.random()) * 7 * 24 * 60 * 60 * 1000),
    }
    moduleLogger.info(
      { fn: 'VisitorDataManager.getId', visitorId: newVisitorId },
      'setting new visitor ID',
    )
    VisitorDataManager.#update({
      visitorId: newVisitorId,
    })
    return newVisitorId.id
  }

  static reset() {
    moduleLogger.info({ fn: 'VisitorDataManager.reset' }, 'resetting visitor data')
    window.localStorage.removeItem('visitorData')
    for (const [, , rejector] of VisitorDataManager.#consentMap.values()) {
      rejector()
    }
    VisitorDataManager.#consentMap.clear()
    // gotta reload to force agent to randomize its tab/session IDs as well
    window.location.reload()
  }

  static #getConsentDeferred(consentType: string) {
    return (
      VisitorDataManager.#consentMap.get(consentType) ??
      (() => {
        const out = deferred<void>()
        VisitorDataManager.#consentMap.set(consentType, out)
        return out
      })()
    )
  }

  static consent(
    consentType: string,
    prompt: () => Promise<void> = async () => undefined,
  ): Promise<void> {
    const [out, resolver] = VisitorDataManager.#getConsentDeferred(consentType)
    if (VisitorDataManager.#get().consent?.[consentType] === true) {
      resolver()
      return out
    } else {
      const promptRejected = new Promise<void>((_resolve, reject) => prompt().catch(reject))
      return Promise.race([out, promptRejected])
    }
  }

  static recordConsent(consentType: string) {
    moduleLogger.info(
      { fn: 'VisitorDataManager.recordConsent', consentType },
      'recording user consent',
    )
    VisitorDataManager.#update({
      consent: {
        [consentType]: true,
      },
    })
    VisitorDataManager.#getConsentDeferred(consentType)[1]()
  }
}
Object.freeze(VisitorDataManager)
Object.freeze(VisitorDataManager.prototype)
