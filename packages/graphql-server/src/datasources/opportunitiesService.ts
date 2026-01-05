import {
  avalancheAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  thorchainAssetId,
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

export type DefiProvider =
  | 'THORCHAIN_SAVERS'
  | 'COSMOS_SDK'
  | 'RFOX'
  | 'ETH_FOX_STAKING'
  | 'SHAPE_SHIFT'
export type DefiType = 'STAKING' | 'LIQUIDITY_POOL'

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
        provider: 'THORCHAIN_SAVERS',
        type: 'STAKING',
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
      provider: 'THORCHAIN_SAVERS',
      type: 'STAKING',
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

export function getCosmosValidatorIds(_chainId: string): string[] {
  console.log(`[Opportunities] Cosmos validator IDs are dynamic from user delegations`)
  return []
}

export function getCosmosValidatorMetadata(
  _chainId: string,
  _validatorIds: string[],
): StakingOpportunityMetadata[] {
  console.log('[Opportunities] Cosmos validator metadata requires chain adapter integration')
  return []
}

type MetadataLoaderKey = { chainId: string; provider: DefiProvider }

function serializeMetadataKey(key: MetadataLoaderKey): string {
  return `${key.chainId}:${key.provider}`
}

function createMetadataLoader() {
  const loaderCache = new Map<string, StakingOpportunityMetadata[]>()

  return new DataLoader<MetadataLoaderKey, StakingOpportunityMetadata[]>(
    async (keys: readonly MetadataLoaderKey[]): Promise<StakingOpportunityMetadata[][]> => {
      console.log(`[Opportunities] Batching ${keys.length} metadata requests`)

      const results = await Promise.all(
        keys.map(({ chainId, provider }) =>
          limit(async (): Promise<StakingOpportunityMetadata[]> => {
            const cacheKey = serializeMetadataKey({ chainId, provider })
            const cached = loaderCache.get(cacheKey)
            if (cached) return cached

            let result: StakingOpportunityMetadata[]
            switch (provider) {
              case 'THORCHAIN_SAVERS':
                result = await getThorchainSaversMetadata()
                break
              case 'COSMOS_SDK':
                result = await getCosmosValidatorMetadata(chainId, [])
                break
              case 'ETH_FOX_STAKING':
                console.log(
                  '[Opportunities] Building ETH_FOX_STAKING metadata for',
                  ETH_FOX_STAKING_CONTRACT_IDS_ARRAY.length,
                  'contracts',
                )
                result = ETH_FOX_STAKING_CONTRACT_IDS_ARRAY.map((contractId: string) => {
                  const metadata = {
                    id: contractId,
                    provider: 'ETH_FOX_STAKING' as const,
                    type: 'STAKING' as const,
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
                  console.log('[Opportunities] ETH_FOX_STAKING metadata:', {
                    id: metadata.id,
                    underlyingAssetId: metadata.underlyingAssetId,
                  })
                  return metadata
                })
                break
              case 'RFOX':
                result = [
                  {
                    id: foxOnArbitrumOneAssetId,
                    provider: 'RFOX' as const,
                    type: 'STAKING' as const,
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
                    provider: 'RFOX' as const,
                    type: 'STAKING' as const,
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
              case 'SHAPE_SHIFT':
                result = [
                  {
                    id: foxyStakingAssetId,
                    provider: 'SHAPE_SHIFT' as const,
                    type: 'STAKING' as const,
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
    case 'THORCHAIN_SAVERS':
      return getThorchainSaversOpportunityIds()
    case 'COSMOS_SDK':
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
    return 'ETH_FOX_STAKING'
  }
  if (RFOX_STAKING_CONTRACT_IDS.has(opportunityId)) {
    return 'RFOX'
  }
  if (THORCHAIN_SAVERS_ASSET_IDS.has(opportunityId)) {
    return 'THORCHAIN_SAVERS'
  }
  if (opportunityId.startsWith('cosmos:')) {
    return 'COSMOS_SDK'
  }
  if (opportunityId === foxyStakingAssetId) {
    return 'SHAPE_SHIFT'
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
    const { account: accountAddress } = fromAccountId(accountId)

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
): Promise<UserStakingOpportunity> {
  const userStakingId = `${accountId}*${opportunityId}`

  try {
    const { account: pubkey, chainId } = fromAccountId(accountId)
    const { account: validatorAddress } = fromAccountId(opportunityId)

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
          case 'ETH_FOX_STAKING':
            result = await fetchEthFoxStakingData(req.accountId, opportunityId)
            break
          case 'RFOX':
            result = await fetchRfoxStakingData(req.accountId, opportunityId)
            break
          case 'THORCHAIN_SAVERS':
            result = await fetchThorchainSaversData(req.accountId, opportunityId)
            break
          case 'COSMOS_SDK':
            result = await fetchCosmosSdkStakingData(req.accountId, opportunityId)
            break
          case 'SHAPE_SHIFT':
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
