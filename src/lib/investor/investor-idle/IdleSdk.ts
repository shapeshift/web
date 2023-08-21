import type { IdleVault } from './constants'
import { apiKey } from './constants/availableTokens'
import { idleServiceFactory } from './idleService'

export class IdleSdk {
  async getVaults(): Promise<IdleVault[]> {
    const idleService = idleServiceFactory()
    const results = await idleService.get(`pools`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (results && results.data) {
      return results.data.filter((data: IdleVault) => data.externalIntegration)
    }
    return []
  }
}
