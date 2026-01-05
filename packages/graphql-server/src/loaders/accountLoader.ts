import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'

import { getNativeAssetId } from '../constants.js'
import type { PortalsToken } from '../datasources/portalsService.js'
import { getPortalsAccount } from '../datasources/portalsService.js'
import type { Account, AccountError, EnrichedTokenBalance, TokenBalance } from '../types.js'
import { getChainConfig } from '../unchained/config.js'
import { getUnchainedApi } from '../unchained/index.js'
import { groupByChainId } from '../utils.js'

export type { Account, EnrichedTokenBalance, TokenBalance }

const ACCOUNT_CACHE_TTL_MS = 30_000

type CachedAccount = {
  data: Account
  timestamp: number
}

const accountCache = new Map<string, CachedAccount>()

function logAccountError(error: AccountError): void {
  console.error(`[AccountLoader] ${error.code}: ${error.message}`, {
    accountId: error.accountId,
    chainId: error.chainId,
  })
}

function createEmptyAccount(
  accountId: string,
  pubkey: string,
  chainId: ChainId,
  nativeAssetId: AssetId,
): Account {
  return {
    id: accountId,
    balance: '0',
    pubkey,
    chainId,
    assetId: nativeAssetId,
    tokens: [],
  }
}

const limit = pLimit(10)

type UnchainedAccountData = {
  balance?: string
  unconfirmedBalance?: string
  pubkey?: string
  nonce?: number
  tokens?: {
    contract?: string
    assetId?: string
    balance?: string
    name?: string
    symbol?: string
    decimals?: number
  }[]
  assets?: { denom?: string; amount?: string }[]
  addresses?: { pubkey: string; balance: string }[]
  nextChangeAddressIndex?: number
  nextReceiveAddressIndex?: number
  sequence?: string
  accountNumber?: string
  delegations?: unknown
  redelegations?: unknown
  undelegations?: unknown
  rewards?: unknown
}

function parseEvmTokens(tokens: UnchainedAccountData['tokens'], chainId: ChainId): TokenBalance[] {
  if (!tokens) return []

  const result: TokenBalance[] = []
  for (const token of tokens) {
    const assetId =
      token.assetId ||
      (token.contract ? `${chainId}/erc20:${token.contract.toLowerCase()}` : undefined)
    if (!assetId || !token.balance) continue
    result.push({
      assetId,
      balance: token.balance,
      name: token.name,
      symbol: token.symbol,
      precision: token.decimals,
    })
  }
  return result
}

function parseCosmosAssets(
  assets: UnchainedAccountData['assets'],
  chainId: ChainId,
): TokenBalance[] {
  if (!assets) return []

  const result: TokenBalance[] = []
  for (const asset of assets) {
    if (asset.denom && asset.amount && asset.amount !== '0') {
      result.push({
        assetId: `${chainId}/${asset.denom}`,
        balance: asset.amount,
      })
    }
  }
  return result
}

function buildEvmAccountData(
  data: UnchainedAccountData,
  tokens: TokenBalance[],
  portalsTokens: PortalsToken[],
): { tokens: EnrichedTokenBalance[]; evmData: Account['evmData'] } {
  const enrichedTokens =
    tokens.length > 0 && portalsTokens.length > 0
      ? enrichTokensWithPortals(tokens, portalsTokens)
      : tokens

  return {
    tokens: enrichedTokens,
    evmData: {
      nonce: data.nonce ?? 0,
      tokens: enrichedTokens,
    },
  }
}

function buildUtxoAccountData(data: UnchainedAccountData): Account['utxoData'] {
  return {
    addresses: data.addresses ?? [],
    nextChangeAddressIndex: data.nextChangeAddressIndex,
    nextReceiveAddressIndex: data.nextReceiveAddressIndex,
  }
}

function buildCosmosAccountData(data: UnchainedAccountData): Account['cosmosData'] {
  return {
    sequence: data.sequence,
    accountNumber: data.accountNumber,
    delegations: data.delegations,
    redelegations: data.redelegations,
    undelegations: data.undelegations,
    rewards: data.rewards,
  }
}

async function fetchFromUnchained(
  chainId: ChainId,
  accounts: { accountId: string; pubkey: string }[],
): Promise<Account[]> {
  const config = getChainConfig(chainId)
  const nativeAssetId = getNativeAssetId(chainId)

  if (!config) {
    for (const { accountId } of accounts) {
      logAccountError({
        code: 'CHAIN_NOT_SUPPORTED',
        message: `No config for chain ${chainId}`,
        accountId,
        chainId,
      })
    }
    return accounts.map(({ accountId, pubkey }) =>
      createEmptyAccount(accountId, pubkey, chainId, nativeAssetId),
    )
  }

  const api = getUnchainedApi(chainId)
  if (!api) {
    for (const { accountId } of accounts) {
      logAccountError({
        code: 'CHAIN_NOT_SUPPORTED',
        message: `No API available for chain ${chainId}`,
        accountId,
        chainId,
      })
    }
    return accounts.map(({ accountId, pubkey }) =>
      createEmptyAccount(accountId, pubkey, chainId, nativeAssetId),
    )
  }

  const results = await Promise.all(
    accounts.map(({ accountId, pubkey }) =>
      limit(async (): Promise<Account> => {
        try {
          const rawData = await api.getAccount({ pubkey })
          const data = rawData as UnchainedAccountData

          const balance = (
            BigInt(data.balance || '0') + BigInt(data.unconfirmedBalance || '0')
          ).toString()

          const chainPrefix = chainId.split(':')[0]
          const tokens: TokenBalance[] = (() => {
            switch (chainPrefix) {
              case 'eip155':
              case 'solana':
                return parseEvmTokens(data.tokens, chainId)
              case 'cosmos':
                return parseCosmosAssets(data.assets, chainId)
              default:
                return []
            }
          })()

          const account: Account = {
            id: accountId,
            balance,
            pubkey: data.pubkey || pubkey,
            chainId,
            assetId: nativeAssetId,
            tokens,
          }

          switch (chainPrefix) {
            case 'eip155': {
              let portalsTokens: PortalsToken[] = []
              if (tokens.length > 0) {
                try {
                  portalsTokens = await getPortalsAccount(chainId, pubkey)
                } catch (error) {
                  console.warn(
                    `[AccountLoader] Failed to fetch Portals data for ${accountId}:`,
                    error,
                  )
                }
              }
              const evmResult = buildEvmAccountData(data, tokens, portalsTokens)
              account.tokens = evmResult.tokens
              account.evmData = evmResult.evmData
              break
            }
            case 'bip122':
              account.utxoData = buildUtxoAccountData(data)
              break
            case 'cosmos':
              account.cosmosData = buildCosmosAccountData(data)
              break
            case 'solana':
              account.solanaData = { tokens }
              break
            default:
              break
          }

          return account
        } catch (error) {
          logAccountError({
            code: 'API_ERROR',
            message: error instanceof Error ? error.message : String(error),
            accountId,
            chainId,
          })
          return createEmptyAccount(accountId, pubkey, chainId, getNativeAssetId(chainId))
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
