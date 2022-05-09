import type {
  RequestData,
  RequestOverrides,
  ResponseData,
  ResponseOverrides,
} from '../../../sw/src/fetchFilters'
import { FetchFilterClient } from '../globals'

export class DemoFilter extends FetchFilterClient.FetchFilterBase {
  static readonly scope = /raw\.githack\.com/i
  readonly id: number
  constructor() {
    super()
    this.id = Math.floor(Math.random() * 65536)
  }
  async filterRequest(reqData: RequestData): Promise<RequestOverrides | boolean> {
    console.info(`DemoFilter(${this.id}): filterRequest`, reqData)
    return true
  }
  async filterRequestBody(body: ArrayBuffer): Promise<ArrayBuffer | false> {
    console.info(`DemoFilter(${this.id}): filterRequestBody`, body)
    return body
  }
  async filterResponse(resData: ResponseData): Promise<ResponseOverrides | boolean> {
    console.info(`DemoFilter(${this.id}): filterResponse`, resData)
    return true
  }
  async filterResponseBody(body: ArrayBuffer): Promise<ArrayBuffer | false> {
    console.info(`DemoFilter(${this.id}): filterResponseBody`, body)
    return body
  }
}
