export const COW_SUPPORTED_CHAINS: Record<number, string> = {
  1: 'mainnet',
  100: 'xdai',
  42161: 'arbitrum_one',
}

export function getCowNetwork(chainId: number): string {
  const network = COW_SUPPORTED_CHAINS[chainId]
  if (!network) {
    const supportedChains = Object.keys(COW_SUPPORTED_CHAINS).join(', ')
    throw new Error(
      `Chain ID ${chainId} is not supported for limit orders. Supported chain IDs: ${supportedChains}`,
    )
  }
  return network
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
