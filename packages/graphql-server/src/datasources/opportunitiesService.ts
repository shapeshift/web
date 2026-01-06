import {
  avalancheAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  cosmosChainId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import DataLoader from 'dataloader'
import pLimit from 'p-limit'
import { createPublicClient, getAddress, http } from 'viem'
import { arbitrum, mainnet } from 'viem/chains'

import {
  getPools as getMidgardPools,
  getRunepoolMember,
  getSaver as getMidgardSaver,
} from './midgardService.js'
import {
  getMimir,
  getPools as getThornodePools,
  getPoolSavers,
  getRuneProvider,
} from './thornodeService.js'

export const DefiProvider = {
  ShapeShift: 'ShapeShift',
  rFOX: 'rFOX',
  EthFoxStaking: 'ETH/FOX Staking',
  CosmosSdk: 'Cosmos SDK',
  ThorchainSavers: 'THORChain Savers',
  ThorchainRunePool: 'THORChain RunePool',
} as const

export const DefiType = {
  Staking: 'staking',
  LiquidityPool: 'lp',
} as const

export type DefiProvider = (typeof DefiProvider)[keyof typeof DefiProvider]
export type DefiType = (typeof DefiType)[keyof typeof DefiType]

export type StakingOpportunityMetadata = {
  id: string
  provider: DefiProvider
  type: DefiType
  assetId: string
  underlyingAssetId: string
  underlyingAssetIds: string[]
  rewardAssetIds: string[]
  underlyingAssetRatiosBaseUnit: string[]
  underlyingAssetWeightPercentageDecimal?: string[]
  apy: string | null
  tvl: string
  name: string
  icon?: string
  isClaimableRewards: boolean
  isReadOnly?: boolean
  expired?: boolean
  active?: boolean
  saversMaxSupplyFiat?: string
  isFull?: boolean
  group?: string
  version?: string
  tags?: string[]
}

export type StakingRewards = {
  amounts: string[]
  claimable: boolean
}

export type UserStakingOpportunity = {
  userStakingId: string
  isLoaded: boolean
  stakedAmountCryptoBaseUnit: string
  rewardsCryptoBaseUnit: StakingRewards
  dateUnlocked?: number
  undelegations?: {
    undelegationAmountCryptoBaseUnit: string
    completionTime: number
  }[]
}

export type StakingMetadataRequest = {
  chainId: string
  provider: DefiProvider
}

export type StakingMetadataResult = {
  chainId: string
  provider: DefiProvider
  opportunities: StakingOpportunityMetadata[]
}

export type UserStakingDataRequest = {
  accountId: string
  opportunityIds: string[]
}

export type UserStakingDataResult = {
  accountId: string
  opportunities: UserStakingOpportunity[]
}

const THOR_POOL_TO_ASSET_ID: Record<string, string> = {
  'BTC.BTC': btcAssetId,
  'ETH.ETH': ethAssetId,
  'LTC.LTC': ltcAssetId,
  'DOGE.DOGE': dogeAssetId,
  'BCH.BCH': bchAssetId,
  'AVAX.AVAX': avalancheAssetId,
  'BSC.BNB': bscAssetId,
  'GAIA.ATOM': cosmosAssetId,
}

const cache = new Map<string, { data: unknown; expires: number }>()
const METADATA_CACHE_TTL_MS = 60 * 1000
const limit = pLimit(5)

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T, ttlMs: number = METADATA_CACHE_TTL_MS): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

function thorPoolAssetToAssetId(thorAsset: string): string | null {
  return THOR_POOL_TO_ASSET_ID[thorAsset] ?? null
}

function fromThorBaseUnit(value: string): number {
  return parseInt(value, 10) / 1e8
}

export async function getThorchainSaversOpportunityIds(): Promise<string[]> {
  const cacheKey = 'opportunities:thorchain_savers:ids'
  const cached = getCached<string[]>(cacheKey)
  if (cached) {
    console.log('[Opportunities] Returning cached THORChain Savers IDs')
    return cached
  }

  console.log('[Opportunities] Fetching THORChain Savers opportunity IDs')

  try {
    const pools = await getThornodePools('thorchain')
    const availablePools = pools.filter(pool => pool.status === 'Available')

    const ids = availablePools
      .map(pool => thorPoolAssetToAssetId(pool.asset))
      .filter((id): id is string => id !== null)

    ids.push(thorchainAssetId)

    setCache(cacheKey, ids)
    return ids
  } catch (error) {
    console.error('[Opportunities] Failed to fetch THORChain Savers IDs:', error)
    return []
  }
}

export async function getThorchainSaversMetadata(): Promise<StakingOpportunityMetadata[]> {
  const cacheKey = 'opportunities:thorchain_savers:metadata'
  const cached = getCached<StakingOpportunityMetadata[]>(cacheKey)
  if (cached) {
    console.log('[Opportunities] Returning cached THORChain Savers metadata')
    return cached
  }

  console.log('[Opportunities] Fetching THORChain Savers metadata')

  try {
    const [thornodePools, midgardPools, mimir] = await Promise.all([
      getThornodePools('thorchain'),
      getMidgardPools('7d'),
      getMimir('thorchain'),
    ])

    if (!thornodePools.length || !midgardPools.length) {
      console.error('[Opportunities] Failed to fetch THORChain pools')
      return []
    }

    const availablePools = thornodePools.filter(pool => pool.status === 'Available')
    const opportunities: StakingOpportunityMetadata[] = []

    for (const thornodePool of availablePools) {
      const assetId = thorPoolAssetToAssetId(thornodePool.asset)
      if (!assetId) continue

      const midgardPool = midgardPools.find(p => p.asset === thornodePool.asset)
      const apy = midgardPool?.saversAPR ?? null

      const synthSupply = fromThorBaseUnit(thornodePool.saversDepth ?? '0')
      const assetPrice = midgardPool ? parseFloat(midgardPool.assetPriceUSD) : 0
      const tvl = (synthSupply * assetPrice).toString()

      const mimirKey = `HALT${thornodePool.asset.replace('.', '')}SYNTH`
      const isFull = (mimir as Record<string, unknown>)?.[mimirKey] === 1

      opportunities.push({
        id: assetId,
        provider: DefiProvider.ThorchainSavers,
        type: DefiType.Staking,
        assetId,
        underlyingAssetId: assetId,
        underlyingAssetIds: [assetId],
        rewardAssetIds: [assetId],
        underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
        apy,
        tvl,
        name: thornodePool.asset.split('.')[1] ?? thornodePool.asset,
        isClaimableRewards: false,
        isFull,
      })
    }

    opportunities.push({
      id: thorchainAssetId,
      provider: DefiProvider.ThorchainSavers,
      type: DefiType.Staking,
      assetId: thorchainAssetId,
      underlyingAssetId: thorchainAssetId,
      underlyingAssetIds: [thorchainAssetId],
      rewardAssetIds: [thorchainAssetId],
      underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
      apy: null,
      tvl: '0',
      name: 'RUNE',
      isClaimableRewards: false,
      isFull: false,
    })

    setCache(cacheKey, opportunities)
    return opportunities
  } catch (error) {
    console.error('[Opportunities] Failed to fetch THORChain Savers metadata:', error)
    return []
  }
}

export async function getRunepoolMetadata(): Promise<StakingOpportunityMetadata[]> {
  const cacheKey = 'opportunities:runepool:metadata'
  const cached = getCached<StakingOpportunityMetadata[]>(cacheKey)
  if (cached) {
    console.log('[Opportunities] Returning cached RUNEPOOL metadata')
    return cached
  }

  console.log('[Opportunities] Fetching RUNEPOOL metadata')

  try {
    const runepoolInfo = await import('./thornodeService.js').then(m =>
      m.getRunepoolInformation('thorchain'),
    )

    if (!runepoolInfo) {
      console.error('[Opportunities] Failed to fetch RUNEPOOL info')
      return []
    }

    const opportunities: StakingOpportunityMetadata[] = [
      {
        id: thorchainAssetId,
        provider: DefiProvider.ThorchainRunePool,
        type: DefiType.Staking,
        assetId: thorchainAssetId,
        underlyingAssetId: thorchainAssetId,
        underlyingAssetIds: [thorchainAssetId],
        rewardAssetIds: [thorchainAssetId],
        underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
        apy: null, // RUNEPOOL doesn't have a simple APY
        tvl: runepoolInfo.providers.value,
        name: 'RUNE Pool',
        isClaimableRewards: true,
      },
    ]

    setCache(cacheKey, opportunities)
    return opportunities
  } catch (error) {
    console.error('[Opportunities] Failed to fetch RUNEPOOL metadata:', error)
    return []
  }
}

export function getCosmosValidatorIds(_chainId: string): string[] {
  console.log(`[Opportunities] Cosmos validator IDs are dynamic from user delegations`)
  return []
}

export async function getCosmosValidatorMetadata(
  chainId: string,
  _validatorIds: string[],
): Promise<StakingOpportunityMetadata[]> {
  const cacheKey = `opportunities:cosmos:${chainId}:validators`
  const cached = getCached<StakingOpportunityMetadata[]>(cacheKey)
  if (cached) {
    console.log('[Opportunities] Returning cached Cosmos validators')
    return cached
  }

  console.log(`[Opportunities] Fetching Cosmos validators for ${chainId}`)

  try {
    // Map chainId to Cosmos API endpoints (in order of preference)
    const chainToApis: Record<string, string[]> = {
      [cosmosChainId]: ['https://dev-api.cosmos.shapeshift.com'],
      // THORChain validators are fetched via THORNode API, not Cosmos SDK API
      // [thorchainChainId]: ['https://dev-api.cosmos.shapeshift.com'],
    }

    const apiUrls = chainToApis[chainId]
    if (!apiUrls) {
      console.log(`[Opportunities] No known API endpoints for chain: ${chainId}`)
      return []
    }

    let response: Response | null = null
    let lastError: Error | null = null

    // Try each endpoint until one works
    for (const apiUrl of apiUrls) {
      try {
        console.log(`[Opportunities] Trying Cosmos API: ${apiUrl}`)
        // Use the ShapeShift API format: /api/v1/validators
        response = await fetch(`${apiUrl}/api/v1/validators?limit=100`)
        if (response.ok) break
      } catch (error) {
        lastError = error as Error
      }
    }

    if (!response || !response.ok) {
      console.error(
        `[Opportunities] All Cosmos API endpoints failed. Last error: ${lastError?.message}`,
      )
      return []
    }

    // ShapeShift API format: { validators: [...] }
    const data = (await response.json()) as {
      validators?: {
        address: string
        moniker: string
        website?: string
        tokens: string
      }[]
    }

    const validators = data.validators ?? []
    console.log(`[Opportunities] Found ${validators.length} validators for ${chainId}`)

    const chainParts = chainId.split(':')
    const chainIdentifier = chainParts[1] ?? chainId

    const opportunities: StakingOpportunityMetadata[] = validators.map(validator => ({
      id: `${chainId}:${validator.address}`,
      provider: DefiProvider.CosmosSdk,
      type: DefiType.Staking,
      assetId: `${chainId}:${validator.address}`,
      underlyingAssetId: `${chainId}:${validator.address}`,
      underlyingAssetIds: [`${chainId}:${validator.address}`],
      rewardAssetIds: [`${chainId}:${validator.address}`],
      underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
      apy: null,
      tvl: validator.tokens,
      name: validator.moniker,
      isClaimableRewards: true,
      group: chainIdentifier,
    }))

    setCache(cacheKey, opportunities, 5 * 60 * 1000)
    return opportunities
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch Cosmos validators for ${chainId}:`, error)
    return []
  }
}

type MetadataLoaderKey = { chainId: string; provider: DefiProvider }

function serializeMetadataKey(key: MetadataLoaderKey): string {
  return `${key.chainId}:${key.provider}`
}

// Map GraphQL enum input values to actual provider strings
const GRAPHQL_PROVIDER_MAP: Record<string, DefiProvider> = {
  ETH_FOX_STAKING: DefiProvider.EthFoxStaking,
  SHAPE_SHIFT: DefiProvider.ShapeShift,
  THORCHAIN_SAVERS: DefiProvider.ThorchainSavers,
  COSMOS_SDK: DefiProvider.CosmosSdk,
  RFOX: DefiProvider.rFOX,
  RUNEPOOL: DefiProvider.ThorchainRunePool,
}

function createMetadataLoader() {
  const loaderCache = new Map<string, StakingOpportunityMetadata[]>()

  return new DataLoader<MetadataLoaderKey, StakingOpportunityMetadata[]>(
    async (keys: readonly MetadataLoaderKey[]): Promise<StakingOpportunityMetadata[][]> => {
      console.log(`[Opportunities] Batching ${keys.length} metadata requests`)

      const results = await Promise.all(
        keys.map(({ chainId, provider }) =>
          limit(async (): Promise<StakingOpportunityMetadata[]> => {
            // Map GraphQL enum value to actual provider string
            const actualProvider = GRAPHQL_PROVIDER_MAP[provider] || provider
            const cacheKey = serializeMetadataKey({ chainId, provider: actualProvider })
            const cached = loaderCache.get(cacheKey)
            if (cached) return cached

            let result: StakingOpportunityMetadata[]
            switch (actualProvider) {
              case DefiProvider.ThorchainSavers:
                result = await getThorchainSaversMetadata()
                break
              case DefiProvider.ThorchainRunePool:
                result = await getRunepoolMetadata()
                break
              case DefiProvider.CosmosSdk:
                result = await getCosmosValidatorMetadata(chainId, [])
                break
              case DefiProvider.EthFoxStaking:
                result = ETH_FOX_STAKING_CONTRACT_IDS_ARRAY.map((contractId: string) => {
                  return {
                    id: contractId,
                    provider: DefiProvider.EthFoxStaking,
                    type: DefiType.Staking,
                    assetId: contractId,
                    underlyingAssetId: foxEthLpAssetId,
                    underlyingAssetIds: foxEthPair,
                    rewardAssetIds: [foxAssetId],
                    underlyingAssetRatiosBaseUnit: ['1000000000000000000', '1000000000000000000'],
                    apy: null,
                    tvl: '0',
                    name: 'Fox Farming',
                    isClaimableRewards: true,
                  }
                })
                break
              case DefiProvider.rFOX:
                result = [
                  {
                    id: foxOnArbitrumOneAssetId,
                    provider: DefiProvider.rFOX,
                    type: DefiType.Staking,
                    assetId: foxOnArbitrumOneAssetId,
                    underlyingAssetId: foxOnArbitrumOneAssetId,
                    underlyingAssetIds: [foxOnArbitrumOneAssetId],
                    rewardAssetIds: ['cosmos:thorchain-1/slip44:931'],
                    underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
                    apy: null,
                    tvl: '0',
                    name: 'rFOX',
                    isClaimableRewards: true,
                  },
                  {
                    id: uniV2EthFoxArbitrumAssetId,
                    provider: DefiProvider.rFOX,
                    type: DefiType.Staking,
                    assetId: uniV2EthFoxArbitrumAssetId,
                    underlyingAssetId: uniV2EthFoxArbitrumAssetId,
                    underlyingAssetIds: [uniV2EthFoxArbitrumAssetId],
                    rewardAssetIds: ['cosmos:thorchain-1/slip44:931'],
                    underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
                    apy: null,
                    tvl: '0',
                    name: 'rFOX LP',
                    isClaimableRewards: true,
                  },
                ]
                break
              case DefiProvider.ShapeShift:
                result = [
                  {
                    id: foxyStakingAssetId,
                    provider: DefiProvider.ShapeShift,
                    type: DefiType.Staking,
                    assetId: foxyStakingAssetId,
                    underlyingAssetId: foxAssetId,
                    underlyingAssetIds: [foxAssetId],
                    rewardAssetIds: [foxyAssetId],
                    underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
                    apy: null,
                    tvl: '0',
                    name: 'FOX',
                    isClaimableRewards: true,
                  },
                ]
                break
              default:
                result = []
            }

            loaderCache.set(cacheKey, result)
            return result
          }),
        ),
      )

      return results
    },
    {
      cache: false,
      maxBatchSize: 10,
      batchScheduleFn: callback => setTimeout(callback, 16),
    },
  )
}

let metadataLoader: DataLoader<MetadataLoaderKey, StakingOpportunityMetadata[]> | null = null

function getMetadataLoader(): DataLoader<MetadataLoaderKey, StakingOpportunityMetadata[]> {
  if (!metadataLoader) {
    metadataLoader = createMetadataLoader()
  }
  return metadataLoader
}

export function getStakingIds(
  chainId: string,
  provider: DefiProvider,
): Promise<string[]> | string[] {
  console.log(`[Opportunities.stakingIds] Fetching IDs for ${chainId}/${provider}`)

  switch (provider) {
    case DefiProvider.ThorchainSavers:
      return getThorchainSaversOpportunityIds()
    case DefiProvider.CosmosSdk:
      return getCosmosValidatorIds(chainId)
    default:
      return []
  }
}

export async function getStakingMetadata(
  requests: StakingMetadataRequest[],
): Promise<StakingMetadataResult[]> {
  console.log(`[Opportunities.stakingMetadata] Fetching metadata for ${requests.length} requests`)

  const loader = getMetadataLoader()

  const results = await Promise.all(
    requests.map(async req => {
      const opportunities = await loader.load({ chainId: req.chainId, provider: req.provider })
      return {
        chainId: req.chainId,
        provider: req.provider,
        opportunities: opportunities instanceof Error ? [] : opportunities,
      }
    }),
  )

  return results
}

const ASSET_ID_TO_THOR_POOL: Record<string, string> = {
  [btcAssetId]: 'BTC.BTC',
  [ethAssetId]: 'ETH.ETH',
  [ltcAssetId]: 'LTC.LTC',
  [dogeAssetId]: 'DOGE.DOGE',
  [bchAssetId]: 'BCH.BCH',
  [avalancheAssetId]: 'AVAX.AVAX',
  [bscAssetId]: 'BSC.BNB',
  [cosmosAssetId]: 'GAIA.ATOM',
}

const ETH_FOX_STAKING_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const RFOX_STAKING_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'stakingInfo',
    outputs: [
      {
        components: [
          { name: 'stakingBalance', type: 'uint256' },
          { name: 'unstakingBalance', type: 'uint256' },
          { name: 'earnedRewards', type: 'uint256' },
          { name: 'rewardPerTokenStored', type: 'uint256' },
          { name: 'runeAddress', type: 'address' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http('https://arb1.arbitrum.io/rpc'),
})

const ETH_FOX_STAKING_CONTRACT_IDS_ARRAY = [
  'eip155:1/erc20:0xdd80e21669a664bce83e3ad9a0d74f8dad5d9e72',
  'eip155:1/erc20:0xc54b9f82c1c54e9d4d274d633c7523f2299c42a0',
  'eip155:1/erc20:0x212ebf9fd3c10f371557b08e993eaab385c3932b',
  'eip155:1/erc20:0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0',
  'eip155:1/erc20:0xc14eaa8284feff79edc118e06cadbf3813a7e555',
  'eip155:1/erc20:0xebb1761ad43034fd7faa64d84e5bbd8cb5c40b68',
  'eip155:1/erc20:0x5939783dbf3e9f453a69bc9ddc1e492efac1fbcb',
  'eip155:1/erc20:0x662da6c777a258382f08b979d9489c3fbbbd8ac3',
  'eip155:1/erc20:0x721720784b76265aa3e34c1c7ba02a6027bcd3e5',
  'eip155:1/erc20:0xe7e16e2b05440c2e484c5c41ac3e5a4d15da2744',
]

const ETH_FOX_STAKING_CONTRACT_IDS = new Set(ETH_FOX_STAKING_CONTRACT_IDS_ARRAY)

const foxOnArbitrumOneAssetId = 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73'
const uniV2EthFoxArbitrumAssetId = 'eip155:42161/erc20:0x5f6ce0ca13b87bd738519545d3e018e70e339c24'

const foxEthLpAssetId = 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c'
const foxAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const foxEthPair = [ethAssetId, foxAssetId]

// FOXy / ShapeShift staking contracts
const foxyAssetId = 'eip155:1/erc20:0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3'
const foxyStakingAssetId = 'eip155:1/erc20:0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b'

const RFOX_STAKING_CONTRACT_IDS = new Set([foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId])

const RFOX_ASSET_ID_TO_CONTRACT: Record<string, string> = {
  [foxOnArbitrumOneAssetId]: '0xaC2a4fD70BCD8Bab0662960455c363735f0e2b56',
  [uniV2EthFoxArbitrumAssetId]: '0x83B51B7605d2E277E03A7D6451B1efc0e5253A2F',
}

const THORCHAIN_SAVERS_ASSET_IDS = new Set([
  btcAssetId,
  ethAssetId,
  ltcAssetId,
  dogeAssetId,
  bchAssetId,
  avalancheAssetId,
  bscAssetId,
  cosmosAssetId,
  thorchainAssetId,
])

function identifyProvider(opportunityId: string): DefiProvider | null {
  if (ETH_FOX_STAKING_CONTRACT_IDS.has(opportunityId)) {
    return DefiProvider.EthFoxStaking
  }
  if (RFOX_STAKING_CONTRACT_IDS.has(opportunityId)) {
    return DefiProvider.rFOX
  }
  if (THORCHAIN_SAVERS_ASSET_IDS.has(opportunityId)) {
    return DefiProvider.ThorchainSavers
  }
  if (opportunityId.startsWith('cosmos:')) {
    return DefiProvider.CosmosSdk
  }
  if (opportunityId === foxyStakingAssetId) {
    return DefiProvider.ShapeShift
  }
  return null
}

async function fetchEthFoxStakingData(
  accountId: string,
  opportunityId: string,
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${opportunityId}`

  try {
    const { account: accountAddress } = fromAccountId(accountId)
    const { assetReference: contractAddress } = fromAssetId(opportunityId)

    const [stakedBalance, earned] = await Promise.all([
      ethereumClient.readContract({
        address: getAddress(contractAddress),
        abi: ETH_FOX_STAKING_ABI,
        functionName: 'balanceOf',
        args: [getAddress(accountAddress)],
      }),
      ethereumClient.readContract({
        address: getAddress(contractAddress),
        abi: ETH_FOX_STAKING_ABI,
        functionName: 'earned',
        args: [getAddress(accountAddress)],
      }),
    ])

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: stakedBalance.toString(),
      rewardsCryptoBaseUnit: {
        amounts: [earned.toString()],
        claimable: true,
      },
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch ETH_FOX_STAKING data:`, error)
    return {
      userStakingId,
      isLoaded: false,
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: [],
        claimable: false,
      },
    }
  }
}

async function fetchRfoxStakingData(
  accountId: string,
  opportunityId: string,
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${opportunityId}`

  try {
    const { account: accountAddress } = fromAccountId(accountId)
    const stakingContractAddress = RFOX_ASSET_ID_TO_CONTRACT[opportunityId]

    if (!stakingContractAddress) {
      throw new Error(`Unknown RFOX staking asset ID: ${opportunityId}`)
    }

    const stakingInfo = await arbitrumClient.readContract({
      address: getAddress(stakingContractAddress),
      abi: RFOX_STAKING_ABI,
      functionName: 'stakingInfo',
      args: [getAddress(accountAddress)],
    })

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: stakingInfo.stakingBalance.toString(),
      rewardsCryptoBaseUnit: {
        amounts: [stakingInfo.earnedRewards.toString()],
        claimable: true,
      },
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch RFOX data:`, error)
    return {
      userStakingId,
      isLoaded: false,
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: [],
        claimable: false,
      },
    }
  }
}

const FOX_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

async function fetchShapeShiftStakingData(
  accountId: string,
  opportunityId: string,
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${opportunityId}`

  try {
    const { account: accountAddress } = fromAccountId(accountId)

    const foxBalance = await ethereumClient.readContract({
      address: getAddress(fromAssetId(foxAssetId).assetReference),
      abi: FOX_ABI,
      functionName: 'balanceOf',
      args: [getAddress(accountAddress)],
    })

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: foxBalance.toString(),
      rewardsCryptoBaseUnit: {
        amounts: ['0'],
        claimable: true,
      },
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch SHAPE_SHIFT data:`, error)
    return {
      userStakingId,
      isLoaded: false,
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: [],
        claimable: false,
      },
    }
  }
}

async function fetchThorchainSaversData(
  accountId: string,
  opportunityId: string,
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${opportunityId}`

  try {
    // thorchain accounts can't use fromAccountId() since thorchain namespace isn't supported
    // AccountId format: thorchain:thorchain:address
    const accountAddress = accountId.split(':')[2]

    if (!accountAddress) {
      throw new Error(`Invalid thorchain accountId: ${accountId}`)
    }

    if (opportunityId === thorchainAssetId) {
      const runeProvider = await getRuneProvider(accountAddress, 'thorchain')
      if (!runeProvider) {
        return {
          userStakingId,
          isLoaded: true,
          stakedAmountCryptoBaseUnit: '0',
          rewardsCryptoBaseUnit: {
            amounts: ['0'],
            claimable: false,
          },
        }
      }

      const stakedAmountCryptoBaseUnit = String(
        BigInt(runeProvider.depositAmount) -
          BigInt(runeProvider.withdrawAmount) +
          BigInt(runeProvider.pnl),
      )
      const redeemValue = runeProvider.value
      const rewards = String(BigInt(redeemValue) - BigInt(stakedAmountCryptoBaseUnit))

      const midgardData = await getRunepoolMember(accountAddress)
      const mimir = (await getMimir('thorchain')) as Record<string, string> | null
      const runePoolMaturityTime = mimir?.POOLCYCLE ? Number(mimir.POOLCYCLE) : 0
      const dateUnlocked = midgardData?.dateLastAdded
        ? Number(midgardData.dateLastAdded) + runePoolMaturityTime
        : undefined

      return {
        userStakingId,
        isLoaded: true,
        stakedAmountCryptoBaseUnit,
        rewardsCryptoBaseUnit: {
          amounts: [rewards],
          claimable: false,
        },
        dateUnlocked,
      }
    }

    const thorPool = ASSET_ID_TO_THOR_POOL[opportunityId]
    if (!thorPool) {
      throw new Error(`No THORChain pool mapping for assetId: ${opportunityId}`)
    }

    const savers = await getPoolSavers(thorPool, 'thorchain')
    const userSaver = savers.find(
      saver => saver.assetAddress.toLowerCase() === accountAddress.toLowerCase(),
    )

    if (!userSaver) {
      return {
        userStakingId,
        isLoaded: true,
        stakedAmountCryptoBaseUnit: '0',
        rewardsCryptoBaseUnit: {
          amounts: ['0'],
          claimable: false,
        },
      }
    }

    const stakedAmount = userSaver.assetDepositValue
    const redeemValue = userSaver.assetRedeemValue
    const rewards = String(BigInt(redeemValue) - BigInt(stakedAmount))

    const midgardSaver = await getMidgardSaver(accountAddress)
    const mimir = (await getMimir('thorchain')) as Record<string, string> | null
    const liquidityLockupTime = mimir?.FULLIMPLOSSPROTECTIONBLOCKS
      ? Number(mimir.FULLIMPLOSSPROTECTIONBLOCKS)
      : 0
    const poolData = midgardSaver?.pools.find(p => p.pool === thorPool)
    const dateUnlocked = poolData?.dateLastAdded
      ? Number(poolData.dateLastAdded) + liquidityLockupTime
      : undefined

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: stakedAmount,
      rewardsCryptoBaseUnit: {
        amounts: [rewards],
        claimable: false,
      },
      dateUnlocked,
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch THORCHAIN_SAVERS data:`, error)
    return {
      userStakingId,
      isLoaded: false,
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: [],
        claimable: false,
      },
    }
  }
}

async function fetchCosmosSdkStakingData(
  accountId: string,
  opportunityId: string,
): Promise<UserStakingOpportunity | null> {
  const { account: pubkey, chainId } = fromAccountId(accountId)

  // If opportunityId is empty or wildcard, fetch ALL user delegations
  if (!opportunityId || opportunityId === 'COSMOS_WILDCARD') {
    console.log(`[Opportunities] Fetching all Cosmos delegations for ${accountId.slice(0, 20)}...`)
    return fetchAllCosmosDelegations(accountId, chainId, pubkey)
  }

  const { account: validatorAddress } = fromAccountId(opportunityId)
  return fetchSingleCosmosDelegation(accountId, chainId, pubkey, validatorAddress)
}

async function fetchAllCosmosDelegations(
  accountId: string,
  chainId: string,
  pubkey: string,
): Promise<UserStakingOpportunity | null> {
  try {
    const api = await import('../unchained/providers.js').then(m => m.getUnchainedApi(chainId))
    if (!api) {
      console.error(`[Opportunities] No unchained API for chainId: ${chainId}`)
      return null
    }

    const accountData = await api.getAccount({ pubkey })

    const delegations = (accountData.delegations ?? []) as {
      validator: { address: string }
      balance: { amount: string }
    }[]
    const rewards = (accountData.rewards ?? []) as {
      validator: { address: string }
      rewards: { amount: string }[]
    }[]
    const undelegations = (accountData.unbondings ?? []) as {
      validator: { address: string }
      entries: { balance: { amount: string }; completionTime: string }[]
    }[]

    if (delegations.length === 0) {
      console.log(`[Opportunities] No Cosmos delegations found for ${accountId.slice(0, 20)}...`)
      return null
    }

    // Aggregate all delegations into a single user staking opportunity
    let totalStaked = BigInt(0)
    let totalRewards = BigInt(0)

    for (const delegation of delegations) {
      totalStaked += BigInt(delegation.balance.amount)
    }

    for (const reward of rewards) {
      for (const r of reward.rewards) {
        const integerAmount = Math.floor(parseFloat(r.amount))
        totalRewards += BigInt(integerAmount)
      }
    }

    const activeUndelegations = undelegations
      .flatMap(u => u.entries)
      .filter(entry => parseInt(entry.completionTime) * 1000 > Date.now())

    const userStakingId = `${accountId}*${chainId}:all-validators`

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: totalStaked.toString(),
      rewardsCryptoBaseUnit: {
        amounts: [totalRewards.toString()],
        claimable: true,
      },
      undelegations: activeUndelegations.map(entry => ({
        undelegationAmountCryptoBaseUnit: entry.balance.amount,
        completionTime: parseInt(entry.completionTime),
      })),
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch all Cosmos delegations:`, error)
    return null
  }
}

async function fetchSingleCosmosDelegation(
  accountId: string,
  chainId: string,
  pubkey: string,
  validatorAddress: string,
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${validatorAddress}`

  try {
    const api = await import('../unchained/providers.js').then(m => m.getUnchainedApi(chainId))
    if (!api) {
      throw new Error(`No unchained API for chainId: ${chainId}`)
    }

    const accountData = await api.getAccount({ pubkey })

    const delegations = (accountData.delegations ?? []) as {
      validator: { address: string }
      balance: { amount: string }
    }[]
    const rewards = (accountData.rewards ?? []) as {
      validator: { address: string }
      rewards: { amount: string }[]
    }[]
    const undelegations = (accountData.unbondings ?? []) as {
      validator: { address: string }
      entries: { balance: { amount: string }; completionTime: string }[]
    }[]

    const delegation = delegations.find(d => d.validator.address === validatorAddress)
    const reward = rewards.find(r => r.validator.address === validatorAddress)
    const undelegation = undelegations.find(u => u.validator.address === validatorAddress)

    const stakedAmount = delegation?.balance?.amount ?? '0'
    const rewardAmounts =
      reward?.rewards.reduce((sum, r) => {
        const integerAmount = Math.floor(parseFloat(r.amount))
        return String(BigInt(sum) + BigInt(integerAmount))
      }, '0') ?? '0'

    const activeUndelegations =
      undelegation?.entries.filter(entry => parseInt(entry.completionTime) * 1000 > Date.now()) ??
      []

    if (stakedAmount === '0' && rewardAmounts === '0' && activeUndelegations.length === 0) {
      return {
        userStakingId,
        isLoaded: true,
        stakedAmountCryptoBaseUnit: '0',
        rewardsCryptoBaseUnit: {
          amounts: ['0'],
          claimable: false,
        },
      }
    }

    return {
      userStakingId,
      isLoaded: true,
      stakedAmountCryptoBaseUnit: stakedAmount,
      rewardsCryptoBaseUnit: {
        amounts: [rewardAmounts],
        claimable: true,
      },
      undelegations: activeUndelegations.map(entry => ({
        undelegationAmountCryptoBaseUnit: entry.balance.amount,
        completionTime: parseInt(entry.completionTime),
      })),
    }
  } catch (error) {
    console.error(`[Opportunities] Failed to fetch COSMOS_SDK data:`, error)
    return {
      userStakingId,
      isLoaded: false,
      stakedAmountCryptoBaseUnit: '0',
      rewardsCryptoBaseUnit: {
        amounts: [],
        claimable: false,
      },
    }
  }
}

export async function getUserStakingData(
  requests: UserStakingDataRequest[],
): Promise<UserStakingDataResult[]> {
  console.log(`[Opportunities.userStakingData] Fetching data for ${requests.length} accounts`)
  console.log(
    `[Opportunities.userStakingData] Request details:`,
    requests.map(r => ({
      accountId: r.accountId,
      opportunityIdsCount: r.opportunityIds.length,
      opportunityIdsSample: r.opportunityIds.slice(0, 5),
    })),
  )

  const results = await Promise.all(
    requests.map(async req => {
      const opportunityPromises = req.opportunityIds.map(async opportunityId => {
        const provider = identifyProvider(opportunityId)

        console.log(`[Opportunities.userStakingData] Processing opportunity:`, {
          accountId: req.accountId.slice(0, 30) + '...',
          opportunityId,
          provider,
        })

        if (!provider) {
          console.warn(`[Opportunities] Unknown provider for opportunity: ${opportunityId}`)
          return null
        }

        let result
        switch (provider) {
          case DefiProvider.EthFoxStaking:
            result = await fetchEthFoxStakingData(req.accountId, opportunityId)
            break
          case DefiProvider.rFOX:
            result = await fetchRfoxStakingData(req.accountId, opportunityId)
            break
          case DefiProvider.ThorchainSavers:
            result = await fetchThorchainSaversData(req.accountId, opportunityId)
            break
          case DefiProvider.CosmosSdk:
            result = await fetchCosmosSdkStakingData(req.accountId, opportunityId)
            break
          case DefiProvider.ShapeShift:
            result = await fetchShapeShiftStakingData(req.accountId, opportunityId)
            break
          default:
            result = null
        }

        if (result) {
          console.log(`[Opportunities.userStakingData] Result for ${opportunityId}:`, {
            isLoaded: result.isLoaded,
            stakedAmount: result.stakedAmountCryptoBaseUnit,
            hasRewards: result.rewardsCryptoBaseUnit?.amounts?.length > 0,
          })
        }

        return result
      })

      const opportunities = (await Promise.all(opportunityPromises)).filter(
        (opp): opp is UserStakingOpportunity => opp !== null,
      )

      console.log(
        `[Opportunities.userStakingData] Account ${req.accountId.slice(0, 30)}... results:`,
        {
          totalOpportunities: opportunities.length,
          loadedOpportunities: opportunities.filter(o => o.isLoaded).length,
          nonZeroStaked: opportunities.filter(o => o.stakedAmountCryptoBaseUnit !== '0').length,
        },
      )

      return {
        accountId: req.accountId,
        opportunities,
      }
    }),
  )

  return results
}
