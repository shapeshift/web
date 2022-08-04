// import https from 'https'
import { availableTokens, IdleVault } from './constants'

export class IdleSdk {
  async getVaults(): Promise<IdleVault[]> {
    // const vaults = await makeRequest('http://localhost:3333/pools?api-key=bPrtC2bfnAvapyXLgdvzVzW8u8igKv6E');
    // if (vaults){
    // this.#vaults = JSON.parse(vaults);
    // }
    return availableTokens
  }
}
