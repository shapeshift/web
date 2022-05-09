import type { RequestData, RequestOverrides } from '../../../sw/src/fetchFilters'
import { FetchFilterClient } from '../globals'

export class Localhost8545Filter extends FetchFilterClient.FetchFilterBase {
  static readonly scope = /^http:\/\/localhost:8545(\/.*)?/i
  async filterRequest(_reqData: RequestData): Promise<RequestOverrides | boolean> {
    return false
  }
}
