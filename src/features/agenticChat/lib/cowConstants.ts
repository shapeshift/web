export const CHAIN_ID_TO_COW_NETWORK: Record<number, string> = {
  1: 'mainnet',
  100: 'xdai',
}

export function getCowNetwork(chainId: number): string {
  return CHAIN_ID_TO_COW_NETWORK[chainId] ?? 'mainnet'
}

export type CowSigningData = {
  domain: {
    verifyingContract?: string
    [key: string]: unknown
  }
  types: object
  primaryType: string
  message: {
    appData?: string
    sellToken?: string
    buyToken?: string
    receiver?: string
    [key: string]: unknown
  }
}
