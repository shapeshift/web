import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ethChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  usdcAssetId,
  usdcOnArbitrumOneAssetId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import {
  RFOX_ABI,
  RFOX_ETH_PROXY_CONTRACT,
  RFOX_ARB_PROXY_CONTRACT,
  RFOX_ARB_UNI_V2_ETH_FOX_PROXY_CONTRACT,
  viemClientByNetworkId,
} from '@shapeshiftoss/contracts'
import type { Address } from 'viem'
import { getAbiItem, getContract } from 'viem'
import { arbitrum, mainnet } from 'viem/chains'

export const stakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Unstake' })

export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'bafkreihv7ilxdosw5rqky22fj5psfjhnwcqnmiurhydddetjpxrjmf32ti'
export const STUB_RUNE_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqn8p0r8'
export const RFOX_V3_UPGRADE_EPOCH = 18

/**
 * The date rFOX staking moves from Arbitrum to Ethereum. Display only - what users can actually do
 * is gated on the contracts' pause flags, so nothing breaks if ops act either side of it.
 */
export const RFOX_MIGRATION_TIMESTAMP_MS = Date.UTC(2026, 9, 1)

export type RfoxStakingConfig = {
  stakingContract: Address
  chainId: ChainId
  /** viem chain id, used to resolve the rpc client for this staking contract */
  networkId: number
  /** the asset rewards are distributed in for epochs from RFOX_V3_UPGRADE_EPOCH onwards */
  rewardAssetId: AssetId
  contractCreationBlock: bigint
  /**
   * Sunset staking programs are only surfaced to users who still hold a position in them, and
   * disappear once that position is fully unstaked and claimed. Unlike the on-chain pause flags -
   * which disable individual actions - this is a product decision about whether the program is
   * still being offered at all, so it is set here rather than derived from chain state.
   */
  isLegacy: boolean
}

/**
 * Order matters: programs are surfaced in this order, with sunset ones sorted last. Flipping a
 * program's isLegacy therefore demotes it in the tab order and moves the default selection on to
 * the next current program, as well as hiding it from users with nothing left to claim.
 */
export const RFOX_STAKING_CONFIG: Record<AssetId, RfoxStakingConfig> = {
  [foxOnArbitrumOneAssetId]: {
    stakingContract: RFOX_ARB_PROXY_CONTRACT,
    chainId: arbitrumChainId,
    networkId: arbitrum.id,
    rewardAssetId: usdcOnArbitrumOneAssetId,
    contractCreationBlock: 222913582n,
    isLegacy: false,
  },
  [foxAssetId]: {
    stakingContract: RFOX_ETH_PROXY_CONTRACT,
    chainId: ethChainId,
    networkId: mainnet.id,
    rewardAssetId: usdcAssetId,
    contractCreationBlock: 25906046n,
    isLegacy: false,
  },
  [uniV2EthFoxArbitrumAssetId]: {
    stakingContract: RFOX_ARB_UNI_V2_ETH_FOX_PROXY_CONTRACT,
    chainId: arbitrumChainId,
    networkId: arbitrum.id,
    rewardAssetId: usdcOnArbitrumOneAssetId,
    contractCreationBlock: 291163572n,
    isLegacy: true,
  },
}

export const RFOX_STAKING_ASSET_IDS: AssetId[] = Object.keys(RFOX_STAKING_CONFIG)

export const RFOX_CURRENT_STAKING_ASSET_IDS: AssetId[] = RFOX_STAKING_ASSET_IDS.filter(
  stakingAssetId => !RFOX_STAKING_CONFIG[stakingAssetId].isLegacy,
)

export const RFOX_STAKING_CHAIN_IDS: ChainId[] = Array.from(
  new Set(Object.values(RFOX_STAKING_CONFIG).map(config => config.chainId)),
)

export const getRfoxContract = (stakingAssetId: AssetId) => {
  const config = RFOX_STAKING_CONFIG[stakingAssetId]
  if (!config) throw new Error(`No rFOX staking config for ${stakingAssetId}`)

  return getContract({
    address: config.stakingContract,
    abi: RFOX_ABI,
    client: viemClientByNetworkId[config.networkId],
  })
}
