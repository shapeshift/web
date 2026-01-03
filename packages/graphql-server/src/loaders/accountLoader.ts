import DataLoader from 'dataloader'

// Aligned with chain-adapters types
export type TokenBalance = {
  assetId: string
  balance: string
  name?: string
  symbol?: string
  precision?: number
}

export type Account = {
  id: string // accountId
  balance: string // native balance
  pubkey: string
  chainId: string
  assetId: string // native asset
  tokens: TokenBalance[]
}

// Parse accountId to extract chainId and pubkey
// AccountId format: chainId:account/pubkey (e.g., "eip155:1:0x123...")
function parseAccountId(accountId: string): { chainId: string; pubkey: string } {
  // Handle CAIP-10 format: chainNamespace:chainReference:address
  const parts = accountId.split(':')
  if (parts.length >= 3) {
    const chainId = `${parts[0]}:${parts[1]}`
    const pubkey = parts.slice(2).join(':')
    return { chainId, pubkey }
  }
  // Fallback for simpler formats
  return { chainId: 'unknown', pubkey: accountId }
}

// Group accounts by chainId for efficient batching
function groupByChainId(
  accountIds: readonly string[],
): Map<string, { accountId: string; pubkey: string }[]> {
  const groups = new Map<string, { accountId: string; pubkey: string }[]>()

  for (const accountId of accountIds) {
    const { chainId, pubkey } = parseAccountId(accountId)
    const existing = groups.get(chainId)
    if (existing) {
      existing.push({ accountId, pubkey })
    } else {
      groups.set(chainId, [{ accountId, pubkey }])
    }
  }

  return groups
}

// Batch function that fetches accounts grouped by chain
async function batchGetAccounts(accountIds: readonly string[]): Promise<(Account | null)[]> {
  console.log(`[AccountLoader] Batching ${accountIds.length} account requests`)

  const groups = groupByChainId(accountIds)
  console.log(`[AccountLoader] Grouped into ${groups.size} chains`)

  // Fetch from each chain in parallel
  const chainResults = await Promise.all(
    Array.from(groups.entries()).map(([chainId, accounts]) => {
      console.log(`[AccountLoader] Fetching ${accounts.length} accounts from chain ${chainId}`)
      return fetchFromUnchained(chainId, accounts)
    }),
  )

  // Merge results back into a map
  const resultMap = new Map<string, Account>()
  for (const chainResult of chainResults) {
    for (const account of chainResult) {
      resultMap.set(account.id, account)
    }
  }

  // Return in the same order as input
  return accountIds.map(id => resultMap.get(id) || null)
}

// Mock implementation - will be replaced with real Unchained integration
async function fetchFromUnchained(
  chainId: string,
  accounts: { accountId: string; pubkey: string }[],
): Promise<Account[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50))

  const nativeAssetId = `${chainId}/slip44:60`

  // Return mock data for demonstration
  return accounts.map(({ accountId, pubkey }) => ({
    id: accountId,
    balance: (Math.random() * 10).toFixed(18),
    pubkey,
    chainId,
    assetId: nativeAssetId,
    tokens: [
      {
        assetId: `${chainId}/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`, // Mock USDC
        balance: (Math.random() * 1000).toFixed(6),
        name: 'USD Coin',
        symbol: 'USDC',
        precision: 6,
      },
    ],
  }))
}

// Create a new DataLoader instance per request
export function createAccountLoader(): DataLoader<string, Account | null> {
  return new DataLoader<string, Account | null>(batchGetAccounts, {
    cache: true,
    maxBatchSize: 50,
  })
}
