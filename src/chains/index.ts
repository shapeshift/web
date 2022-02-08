import type { CAIP2, CAIP19 } from '@shapeshiftoss/caip'

const supportedCoins = ['bitcoin', 'ethereum', 'cosmos']

type AccountProps = { accountId: string }
type AssetProps = { assetId: CAIP19 }
type SearchableAssetProps = { collapsed: boolean; search?: string }
export type SupportedChains = [caip2: string, chain: SupportedChain][]
type RegistrableChain = { register: () => SupportedChains }

export interface SupportedChain {
  functions: {
    getAccountIds: () => Promise<string[]>
  }
  components: {
    accounts: {
      list: React.FC<SearchableAssetProps>
      row: React.FC<AccountProps>
    }
    assets: {
      list: React.FC<SearchableAssetProps>
      row: React.FC<AssetProps>
    }
  }
  routes: {
    accounts: {
      [k: CAIP2]: React.FC
    }
  }
}

class ChainManager {
  #chainManager = new Map<string, SupportedChain>()

  register(chains: [caip2: string, chain: SupportedChain][]): void {
    for (const [caip2, chain] of chains) {
      this.#chainManager.set(caip2, chain)
    }
  }

  getRegisteredChains() {
    return Object.fromEntries(this.#chainManager.entries())
  }
}

export const chainManager = new ChainManager()
export const registerChains = async () => {
  // @TODO: Not super efficient but I don't care
  for (const chain in supportedCoins) {
    chainManager.register(((await import(`./${chain}/index.tsx`)) as RegistrableChain).register())
  }
}
