import type { Chain } from 'viem'
import { createPublicClient, getAddress, http, isAddress } from 'viem'
import { arbitrum, avalanche, base, bsc, gnosis, mainnet, optimism, polygon } from 'viem/chains'

const smartContractCache = new Map<string, boolean>()

const CHAIN_ID_TO_VIEM_CHAIN: Record<string, Chain> = {
  'eip155:1': mainnet,
  'eip155:10': optimism,
  'eip155:56': bsc,
  'eip155:100': gnosis,
  'eip155:137': polygon,
  'eip155:8453': base,
  'eip155:42161': arbitrum,
  'eip155:43114': avalanche,
}

const clientCache = new Map<string, ReturnType<typeof createPublicClient>>()

function getClient(chainId: string) {
  const cached = clientCache.get(chainId)
  if (cached) return cached

  const chain = CHAIN_ID_TO_VIEM_CHAIN[chainId]
  if (!chain) return null

  const client = createPublicClient({
    chain,
    transport: http(),
  })

  clientCache.set(chainId, client)
  return client
}

export async function isSmartContractAddress(address: string, chainId: string): Promise<boolean> {
  if (!isAddress(address)) return false

  const chain = CHAIN_ID_TO_VIEM_CHAIN[chainId]
  if (!chain) return false

  const cacheKey = `${chainId}:${address.toLowerCase()}`
  const cached = smartContractCache.get(cacheKey)
  if (cached !== undefined) {
    console.log(`[EVM] Cache hit for isSmartContractAddress: ${cacheKey} = ${cached}`)
    return cached
  }

  const client = getClient(chainId)
  if (!client) return false

  console.log(`[EVM] Checking if address is smart contract: ${address} on ${chainId}`)

  try {
    const bytecode = await client.getBytecode({ address: getAddress(address) })
    const isContract = bytecode !== undefined && bytecode !== '0x'

    if (isContract) {
      smartContractCache.set(cacheKey, true)
    }

    return isContract
  } catch (error) {
    console.error(`[EVM] Failed to check bytecode for ${address} on ${chainId}:`, error)
    return false
  }
}

export function batchIsSmartContractAddress(
  requests: { address: string; chainId: string }[],
): Promise<boolean[]> {
  console.log(`[EVM] Batch checking ${requests.length} addresses for smart contracts`)

  return Promise.all(
    requests.map(({ address, chainId }) => isSmartContractAddress(address, chainId)),
  )
}

export function clearEvmCache(): void {
  smartContractCache.clear()
  console.log('[EVM] Cache cleared')
}
