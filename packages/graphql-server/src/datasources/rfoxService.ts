import axios from 'axios'

const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'
const CURRENT_EPOCH_IPFS_HASH = 'bafkreiapwxmfytgbbiar6nrmjmrbhd6llhf5gdg2lz6mo5yjshqj6xsgoy'

export type CurrentEpochMetadata = {
  epoch: number
  epochStartTimestamp: number
  epochEndTimestamp: number
  treasuryAddress: string
  burnRate: number
  distributionRateByStakingContract: Record<string, number>
  ipfsHashByEpoch: Record<string, string>
}

export type RewardDistribution = {
  amount: string
  rewardUnits: string
  totalRewardUnits: string
  txId: string
  rewardAddress: string
}

export type EpochDetails = {
  totalRewardUnits: string
  distributionRate: number
  assetPriceUsd?: string
  distributionsByStakingAddress: Record<string, RewardDistribution>
}

export type Epoch = {
  number: number
  startTimestamp: number
  endTimestamp: number
  distributionTimestamp: number
  startBlock: number
  endBlock: number
  treasuryAddress: string
  totalRevenue: string
  burnRate: number
  runePriceUsd?: string
  distributionStatus: 'pending' | 'complete'
  detailsByStakingContract: Record<string, EpochDetails>
}

export type EpochWithIpfsHash = Epoch & { ipfsHash: string }

const epochCache = new Map<string, Epoch>()
let metadataCache: { data: CurrentEpochMetadata; fetchedAt: number } | null = null
const METADATA_CACHE_TTL_MS = 5 * 60 * 1000

export const getCurrentEpochMetadata = async (): Promise<CurrentEpochMetadata> => {
  if (metadataCache && Date.now() - metadataCache.fetchedAt < METADATA_CACHE_TTL_MS) {
    return metadataCache.data
  }

  console.log('[RFOX] Fetching current epoch metadata from IPFS')
  const { data } = await axios.get<CurrentEpochMetadata>(
    `${IPFS_GATEWAY}/${CURRENT_EPOCH_IPFS_HASH}`,
  )

  metadataCache = { data, fetchedAt: Date.now() }
  return data
}

export const getEpoch = async (ipfsHash: string): Promise<EpochWithIpfsHash> => {
  const cached = epochCache.get(ipfsHash)
  if (cached) {
    return { ...cached, ipfsHash }
  }

  console.log(`[RFOX] Fetching epoch from IPFS: ${ipfsHash}`)
  const { data } = await axios.get<Epoch>(`${IPFS_GATEWAY}/${ipfsHash}`)

  epochCache.set(ipfsHash, data)

  return { ...data, ipfsHash }
}

export const getEpochHistory = async (): Promise<EpochWithIpfsHash[]> => {
  const metadata = await getCurrentEpochMetadata()

  console.log(`[RFOX] Fetching ${Object.keys(metadata.ipfsHashByEpoch).length} epochs in parallel`)

  const epochs = await Promise.all(
    Object.values(metadata.ipfsHashByEpoch).map(hash => getEpoch(hash)),
  )

  return epochs.sort((a, b) => b.number - a.number)
}
