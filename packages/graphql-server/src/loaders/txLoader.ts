import DataLoader from 'dataloader'

// Aligned with chain-adapters TxTransfer type
export type Transfer = {
  type: string // TransferType: 'Send' | 'Receive' | 'Contract'
  assetId: string
  value: string
  from: string[]
  to: string[]
}

// Aligned with chain-adapters Transaction type (omits address from StandardTx)
export type Transaction = {
  txid: string
  pubkey: string
  blockHeight: number | null
  blockTime: number | null
  chainId: string
  status: string // TxStatus: 'Confirmed' | 'Pending' | 'Failed' | 'Unknown'
  fee: string | null
  transfers: Transfer[]
}

export type TxHistoryResult = {
  accountId: string
  transactions: Transaction[]
  cursor: string | null
}

// Parse accountId to extract chainId and pubkey
function parseAccountId(accountId: string): { chainId: string; pubkey: string } {
  const parts = accountId.split(':')
  if (parts.length >= 3) {
    const chainId = `${parts[0]}:${parts[1]}`
    const pubkey = parts.slice(2).join(':')
    return { chainId, pubkey }
  }
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

// Batch function that fetches transactions grouped by chain
async function batchGetTransactions(accountIds: readonly string[]): Promise<TxHistoryResult[]> {
  console.log(`[TxLoader] Batching ${accountIds.length} tx history requests`)

  const groups = groupByChainId(accountIds)
  console.log(`[TxLoader] Grouped into ${groups.size} chains`)

  // Fetch from each chain in parallel
  const chainResults = await Promise.all(
    Array.from(groups.entries()).map(([chainId, accounts]) => {
      console.log(
        `[TxLoader] Fetching tx history for ${accounts.length} accounts from chain ${chainId}`,
      )
      return fetchTxHistoryFromUnchained(chainId, accounts)
    }),
  )

  // Merge results back into a map
  const resultMap = new Map<string, TxHistoryResult>()
  for (const chainResult of chainResults) {
    for (const result of chainResult) {
      resultMap.set(result.accountId, result)
    }
  }

  // Return in the same order as input
  return accountIds.map(
    id =>
      resultMap.get(id) || {
        accountId: id,
        transactions: [],
        cursor: null,
      },
  )
}

// Mock implementation - will be replaced with real Unchained integration
async function fetchTxHistoryFromUnchained(
  chainId: string,
  accounts: { accountId: string; pubkey: string }[],
): Promise<TxHistoryResult[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // Return mock data for demonstration
  return accounts.map(({ accountId, pubkey }) => ({
    accountId,
    transactions: [
      {
        txid: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        pubkey,
        blockHeight: Math.floor(Math.random() * 1000000),
        blockTime: Math.floor((Date.now() - Math.random() * 86400000) / 1000),
        chainId,
        status: 'Confirmed',
        fee: (Math.random() * 0.01).toFixed(18),
        transfers: [
          {
            type: 'Send',
            assetId: `${chainId}/slip44:60`,
            value: (Math.random() * 1).toFixed(18),
            from: [pubkey],
            to: ['0x' + 'a'.repeat(40)],
          },
        ],
      },
    ],
    cursor: null,
  }))
}

// Create a new DataLoader instance per request
export function createTxLoader(): DataLoader<string, TxHistoryResult> {
  return new DataLoader<string, TxHistoryResult>(batchGetTransactions, {
    cache: true,
    maxBatchSize: 50,
  })
}
