import { vaults } from '../constants/vaults'

// contract interaction layer
export class YearnVaultApi {
  // constructor() {}
  async findAll() {
    return Promise.resolve(vaults)
  }

  async findByTokenId(tokenId: string) {
    const vault = vaults.find(vault => vault.depositToken === tokenId)
    if (!vault) throw new Error(`Vault for ${tokenId} isn't supported`)
    return Promise.resolve(vault)
  }

  approve() {}
  allowance() {}
  add() {}
  remove() {}
  balance() {}
  totalSupply() {}
  apy() {}
}
