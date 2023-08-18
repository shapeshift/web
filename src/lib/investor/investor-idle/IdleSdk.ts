import { idleServiceFactory } from 'lib/investor/investor-idle/idleService'

import type { IdleVault } from './constants'
import { apiKey } from './constants/availableTokens'

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
