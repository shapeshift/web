import type { ChainId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'

import type { PortalsToken } from '../datasources/portalsService.js'
import { getPortalsAccount } from '../datasources/portalsService.js'
import { getChainConfig } from '../unchained/config.js'
import { getUnchainedApi } from '../unchained/index.js'

const ACCOUNT_CACHE_TTL_MS = 30_000

type CachedAccount = {
  data: Account
  timestamp: number
}

const accountCache = new Map<string, CachedAccount>()

export type TokenBalance = {
  assetId: string
  balance: string
  name?: string
  symbol?: string
  precision?: number
}

export type PortalsEnrichment = {
  isPool?: boolean
  platform?: string
  underlyingTokens?: string[]
  images?: string[]
  liquidity?: number
  apy?: string
  price?: string
  pricePerShare?: string
}

export type EnrichedTokenBalance = TokenBalance & PortalsEnrichment

export type UtxoAddress = {
  pubkey: string
  balance: string
}

export type EvmAccountData = {
  nonce: number
  tokens: TokenBalance[]
}

export type UtxoAccountData = {
  addresses: UtxoAddress[]
  nextChangeAddressIndex?: number
  nextReceiveAddressIndex?: number
}

export type CosmosAccountData = {
  sequence?: string
  accountNumber?: string
  delegations?: unknown
  redelegations?: unknown
  undelegations?: unknown
  rewards?: unknown
}

export type SolanaAccountData = {
  tokens: TokenBalance[]
}

export type Account = {
  id: string
  balance: string
  pubkey: string
  chainId: string
  assetId: string
  tokens: EnrichedTokenBalance[]
  evmData?: EvmAccountData
  utxoData?: UtxoAccountData
  cosmosData?: CosmosAccountData
  solanaData?: SolanaAccountData
}

function parseAccountId(accountId: string): { chainId: ChainId; pubkey: string } {
  const parts = accountId.split(':')
  if (parts.length >= 3) {
    const chainId = `${parts[0]}:${parts[1]}` as ChainId
    const pubkey = parts.slice(2).join(':')
    return { chainId, pubkey }
  }
  return { chainId: 'unknown' as ChainId, pubkey: accountId }
}

function groupByChainId(
  accountIds: readonly string[],
): Map<ChainId, { accountId: string; pubkey: string }[]> {
  const groups = new Map<ChainId, { accountId: string; pubkey: string }[]>()

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

const limit = pLimit(10)

async function fetchFromUnchained(
  chainId: ChainId,
  accounts: { accountId: string; pubkey: string }[],
): Promise<Account[]> {
  const config = getChainConfig(chainId)
  if (!config) {
    console.warn(`[AccountLoader] No config for chain ${chainId}, returning empty accounts`)
    return accounts.map(({ accountId, pubkey }) => ({
      id: accountId,
      balance: '0',
      pubkey,
      chainId,
      assetId: `${chainId}/slip44:60`,
      tokens: [],
    }))
  }

  const api = getUnchainedApi(chainId)
  if (!api) {
    console.warn(`[AccountLoader] No API for chain ${chainId}, returning empty accounts`)
    return accounts.map(({ accountId, pubkey }) => ({
      id: accountId,
      balance: '0',
      pubkey,
      chainId,
      assetId: `${chainId}/slip44:60`,
      tokens: [],
    }))
  }

  const results = await Promise.all(
    accounts.map(({ accountId, pubkey }) =>
      limit(async (): Promise<Account> => {
        try {
          const data = await api.getAccount({ pubkey })

          const balance = (
            BigInt(data.balance || '0') + BigInt(data.unconfirmedBalance || '0')
          ).toString()

          const tokens: TokenBalance[] = []

          if ('tokens' in data && Array.isArray(data.tokens)) {
            for (const token of data.tokens) {
              const contractAddress =
                'contract' in token ? (token as { contract?: string }).contract : undefined
              const directAssetId =
                'assetId' in token ? (token as { assetId?: string }).assetId : undefined
              const tokenAssetId =
                directAssetId ||
                (contractAddress ? `${chainId}/erc20:${contractAddress.toLowerCase()}` : undefined)

              if (tokenAssetId && token.balance) {
                tokens.push({
                  assetId: tokenAssetId,
                  balance: token.balance,
                  name: token.name,
                  symbol: token.symbol,
                  precision: token.decimals,
                })
              }
            }
          }

          if ('assets' in data && Array.isArray(data.assets)) {
            for (const asset of data.assets as { denom?: string; amount?: string }[]) {
              if (asset.denom && asset.amount && asset.amount !== '0') {
                tokens.push({
                  assetId: `${chainId}/${asset.denom}`,
                  balance: asset.amount,
                })
              }
            }
          }

          const nativeAssetId = getNativeAssetId(chainId)

          const account: Account = {
            id: accountId,
            balance,
            pubkey: data.pubkey || pubkey,
            chainId,
            assetId: nativeAssetId,
            tokens,
          }

          const chainPrefix = chainId.split(':')[0]
          switch (chainPrefix) {
            case 'eip155': {
              let enrichedTokens: EnrichedTokenBalance[] = tokens
              if (tokens.length > 0) {
                try {
                  const portalsTokens = await getPortalsAccount(chainId, pubkey)
                  if (portalsTokens.length > 0) {
                    enrichedTokens = enrichTokensWithPortals(tokens, portalsTokens)
                  }
                } catch (error) {
                  console.warn(
                    `[AccountLoader] Failed to fetch Portals data for ${accountId}:`,
                    error,
                  )
                }
              }
              account.tokens = enrichedTokens
              account.evmData = {
                nonce: 'nonce' in data ? (data.nonce as number) : 0,
                tokens: enrichedTokens,
              }
              break
            }
            case 'bip122':
              account.utxoData = {
                addresses:
                  'addresses' in data && Array.isArray(data.addresses)
                    ? data.addresses.map(addr => ({
                        pubkey: (addr as { pubkey: string }).pubkey,
                        balance: (addr as { balance: string }).balance,
                      }))
                    : [],
                nextChangeAddressIndex:
                  'nextChangeAddressIndex' in data
                    ? (data.nextChangeAddressIndex as number)
                    : undefined,
                nextReceiveAddressIndex:
                  'nextReceiveAddressIndex' in data
                    ? (data.nextReceiveAddressIndex as number)
                    : undefined,
              }
              break
            case 'cosmos':
              account.cosmosData = {
                sequence: 'sequence' in data ? (data.sequence as string) : undefined,
                accountNumber: 'accountNumber' in data ? (data.accountNumber as string) : undefined,
                delegations: 'delegations' in data ? data.delegations : undefined,
                redelegations: 'redelegations' in data ? data.redelegations : undefined,
                undelegations: 'undelegations' in data ? data.undelegations : undefined,
                rewards: 'rewards' in data ? data.rewards : undefined,
              }
              break
            case 'solana':
              account.solanaData = {
                tokens,
              }
              break
            default:
              break
          }

          return account
        } catch (error) {
          console.error(`[AccountLoader] Error fetching account ${accountId}:`, error)
          return {
            id: accountId,
            balance: '0',
            pubkey,
            chainId,
            assetId: getNativeAssetId(chainId),
            tokens: [],
          }
        }
      }),
    ),
  )

  return results
}

function enrichTokensWithPortals(
  tokens: TokenBalance[],
  portalsTokens: PortalsToken[],
): EnrichedTokenBalance[] {
  const portalsMap = new Map<string, PortalsToken>()
  for (const pt of portalsTokens) {
    portalsMap.set(pt.address.toLowerCase(), pt)
  }

  return tokens.map(token => {
    const contractAddress = token.assetId.split('/erc20:')[1]
    if (!contractAddress) return token

    const portalsToken = portalsMap.get(contractAddress.toLowerCase())
    if (!portalsToken) return token

    const isPool = Boolean(portalsToken.platform && portalsToken.tokens?.length > 0)

    return {
      ...token,
      name: portalsToken.name || token.name,
      isPool,
      platform: portalsToken.platform,
      underlyingTokens: portalsToken.tokens,
      images: portalsToken.images ?? undefined,
      liquidity: portalsToken.liquidity,
      apy: portalsToken.apy ?? undefined,
      price: portalsToken.price ?? undefined,
      pricePerShare: portalsToken.pricePerShare ?? undefined,
    }
  })
}

function getNativeAssetId(chainId: ChainId): string {
  const nativeAssetMap: Record<string, string> = {
    // EVM chains
    'eip155:1': 'eip155:1/slip44:60',
    'eip155:43114': 'eip155:43114/slip44:60',
    'eip155:10': 'eip155:10/slip44:60',
    'eip155:56': 'eip155:56/slip44:60',
    'eip155:137': 'eip155:137/slip44:60',
    'eip155:100': 'eip155:100/slip44:60',
    'eip155:42161': 'eip155:42161/slip44:60',
    'eip155:42170': 'eip155:42170/slip44:60',
    'eip155:8453': 'eip155:8453/slip44:60',
    'eip155:143': 'eip155:143/slip44:60',
    'eip155:999': 'eip155:999/slip44:60',
    'eip155:9745': 'eip155:9745/slip44:60',
    // UTXO chains
    'bip122:000000000019d6689c085ae165831e93': 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    'bip122:000000000000000000651ef99cb9fcbe': 'bip122:000000000000000000651ef99cb9fcbe/slip44:145',
    'bip122:00000000001a91e3dace36e2be3bf030': 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',
    'bip122:12a765e31ffd4059bada1e25190f6e98': 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    'bip122:00040fe8ec8471911baa1db1266ea15d': 'bip122:00040fe8ec8471911baa1db1266ea15d/slip44:133',
    // Cosmos chains
    'cosmos:cosmoshub-4': 'cosmos:cosmoshub-4/slip44:118',
    'cosmos:thorchain-1': 'cosmos:thorchain-1/slip44:931',
    'cosmos:mayachain-mainnet-v1': 'cosmos:mayachain-mainnet-v1/slip44:931',
    // Other chains
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    'tron:0x2b6653dc': 'tron:0x2b6653dc/slip44:195',
    'sui:35834a8a': 'sui:35834a8a/slip44:784',
    'near:mainnet': 'near:mainnet/slip44:397',
    'starknet:SN_MAIN': 'starknet:SN_MAIN/slip44:9004',
  }
  return nativeAssetMap[chainId] || `${chainId}/slip44:60`
}

async function batchGetAccounts(accountIds: readonly string[]): Promise<(Account | null)[]> {
  console.log(`[AccountLoader] Batching ${accountIds.length} account requests`)

  const now = Date.now()
  const cachedResults = new Map<string, Account>()
  const uncachedAccountIds: string[] = []

  for (const accountId of accountIds) {
    const cached = accountCache.get(accountId)
    if (cached && now - cached.timestamp < ACCOUNT_CACHE_TTL_MS) {
      cachedResults.set(accountId, cached.data)
    } else {
      uncachedAccountIds.push(accountId)
    }
  }

  if (cachedResults.size > 0) {
    console.log(`[AccountLoader] Cache hit for ${cachedResults.size} accounts`)
  }

  if (uncachedAccountIds.length === 0) {
    return accountIds.map(id => cachedResults.get(id) || null)
  }

  console.log(`[AccountLoader] Fetching ${uncachedAccountIds.length} uncached accounts`)

  const groups = groupByChainId(uncachedAccountIds)
  console.log(`[AccountLoader] Grouped into ${groups.size} chains`)

  const chainResults = await Promise.all(
    Array.from(groups.entries()).map(([chainId, accounts]) => {
      console.log(`[AccountLoader] Fetching ${accounts.length} accounts from chain ${chainId}`)
      return fetchFromUnchained(chainId, accounts)
    }),
  )

  const resultMap = new Map<string, Account>(cachedResults)
  for (const chainResult of chainResults) {
    for (const account of chainResult) {
      resultMap.set(account.id, account)
      accountCache.set(account.id, { data: account, timestamp: now })
    }
  }

  return accountIds.map(id => resultMap.get(id) || null)
}

export function createAccountLoader(): DataLoader<string, Account | null> {
  return new DataLoader<string, Account | null>(batchGetAccounts, {
    cache: true,
    maxBatchSize: 50,
  })
}
