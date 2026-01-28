export const COW_SUPPORTED_CHAINS: Record<number, string> = {
  1: 'mainnet',
  100: 'xdai',
  42161: 'arbitrum_one',
}

export const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  gnosis: 100,
  arbitrum: 42161,
}

export const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'ethereum',
  100: 'gnosis',
  42161: 'arbitrum',
}

export function isCowSupportedChain(chainId: number): boolean {
  return chainId in COW_SUPPORTED_CHAINS
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

export function getCowExplorerUrl(orderId: string): string {
  return `https://explorer.cow.fi/orders/${orderId}`
}

export function getCowApiUrl(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'https://api.cow.fi/mainnet'
    case 100:
      return 'https://api.cow.fi/xdai'
    case 42161:
      return 'https://api.cow.fi/arbitrum_one'
    default:
      throw new Error(`Chain ID ${chainId} is not supported by CoW Protocol`)
  }
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
