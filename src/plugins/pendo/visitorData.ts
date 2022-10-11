import forEach from 'lodash/forEach'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['Plugin', 'Pendo', 'VisitorDataManager'] })

export type VisitorId = {
  id: string
}

export type VisitorData = {
  visitorId: VisitorId
  consent: Record<string, true>
}

export class VisitorDataManager {
  static readonly #consentMap = new Map<string, boolean>()
  static #visitorId: VisitorId = { id: '' }

  static load(): void {
    const raw = window.localStorage.getItem('visitorData') ?? '{"consent":{}}'
    moduleLogger.trace({ fn: 'load', raw }, 'get visitorData')
    try {
      const data: VisitorData = JSON.parse(raw)
      VisitorDataManager.#visitorId.id = data.visitorId?.id
      VisitorDataManager.#consentMap.clear()
      forEach(data.consent, (v, k) => VisitorDataManager.#consentMap.set(k, v))

      // Create a new ID if there isn't a stored ID or if it has expired
      VisitorDataManager.getId().catch(e =>
        moduleLogger.error(e, { fn: 'load' }, 'Error updating visitorId'),
      )
    } catch (e) {
      moduleLogger.error(e, { fn: 'load', raw }, 'parse error')
      window.localStorage.removeItem('visitorData')
    }
  }

  static #save() {
    try {
      const data = {
        consent: Object.fromEntries(VisitorDataManager.#consentMap),
        visitorId: VisitorDataManager.#visitorId,
      }
      moduleLogger.trace({ fn: '#save', data }, 'setting new visitor data')
      window.localStorage.setItem('visitorData', JSON.stringify(data))
    } catch (e) {
      moduleLogger.error(e, { fn: '#update' }, 'update error')
      window.localStorage.removeItem('visitorData')
    }
  }

  /**
   * Get the current visitorId, or set a new one and return it
   */
  static async getId(): Promise<string> {
    const currentVisitorId = VisitorDataManager.#visitorId
    if (currentVisitorId.id) return currentVisitorId.id

    const newVisitorId = {
      id: Buffer.from(window.crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
    }
    moduleLogger.debug({ fn: 'getId', visitorId: newVisitorId }, 'setting new visitor ID')
    VisitorDataManager.#visitorId.id = newVisitorId.id
    VisitorDataManager.#save()
    return newVisitorId.id
  }

  static reset() {
    moduleLogger.trace({ fn: 'reset' }, 'resetting visitor data')
    window.localStorage.removeItem('visitorData')
    VisitorDataManager.#visitorId.id = ''
    VisitorDataManager.#consentMap.clear()
    // reload to force agent to randomize its tab/session IDs as well
    window.location.reload()
  }

  static checkConsent(consentType: string): boolean | undefined {
    const consent = VisitorDataManager.#consentMap.get(consentType)
    moduleLogger.trace({ fn: 'checkConsent', consent }, 'check consent')
    return consent
  }

  static recordConsent(consentType: string, consentGiven: boolean) {
    moduleLogger.debug({ fn: 'recordConsent', consentType, consentGiven }, 'recording user consent')
    VisitorDataManager.#consentMap.set(consentType, consentGiven)
    VisitorDataManager.#save()
  }
}

Object.freeze(VisitorDataManager)
Object.freeze(VisitorDataManager.prototype)
