import axios from 'axios'

import type { IdleVault } from './constants'
import { apiKey, baseUrl } from './constants/availableTokens'

export class IdleSdk {
  async getVaults(): Promise<IdleVault[]> {
    const results = await axios.get(`${baseUrl}pools`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (results && results.data) {
      return results.data.filter((data: IdleVault) => data.externalIntegration)
    }
    return []
  }
}
