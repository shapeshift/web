import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ethChainId,
  foxAssetId,
  foxOnArbitrumOneAssetId,
  thorchainAssetId,
  uniV2EthFoxArbitrumAssetId,
  usdcAssetId,
  usdcOnArbitrumOneAssetId,
} from '@shapeshiftoss/caip'
import {
  RFOX_ABI,
  RFOX_ARB_PROXY_CONTRACT,
  RFOX_ARB_UNI_V2_ETH_FOX_PROXY_CONTRACT,
  RFOX_ETH_PROXY_CONTRACT,
  viemClientByNetworkId,
} from '@shapeshiftoss/contracts'
import type { Address } from 'viem'
import { getAbiItem, getContract } from 'viem'
import { arbitrum, mainnet } from 'viem/chains'

export const stakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Unstake' })

export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'bafkreib3ftdt4rhq4fapplsyesyzyorayvnc3a4csdmmbzbaim6tb3gndi'
export const STUB_RUNE_ADDRESS = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqn8p0r8'
export const RFOX_V3_UPGRADE_EPOCH = 18

// Months are 0 indexed, so this is October 1st
export const RFOX_MIGRATION_TIMESTAMP_MS = Date.UTC(2026, 9, 1)

export type RfoxStakingConfig = {
  stakingContract: Address
  chainId: ChainId
  networkId: typeof arbitrum.id | typeof mainnet.id
  rewardAssetId: AssetId
  // Whether the program is still offered at all, as opposed to the pause flags disabling an action
  // A sunset program is surfaced only to users with a position left to unstake or claim
  isLegacy: boolean
}

// Order matters: programs surface in this order, with sunset ones sorted last
export const RFOX_STAKING_CONFIG: Record<AssetId, RfoxStakingConfig> = {
  [foxOnArbitrumOneAssetId]: {
    stakingContract: RFOX_ARB_PROXY_CONTRACT,
    chainId: arbitrumChainId,
    networkId: arbitrum.id,
    rewardAssetId: usdcOnArbitrumOneAssetId,
    isLegacy: false,
  },
  [foxAssetId]: {
    stakingContract: RFOX_ETH_PROXY_CONTRACT,
    chainId: ethChainId,
    networkId: mainnet.id,
    rewardAssetId: usdcAssetId,
    isLegacy: false,
  },
  [uniV2EthFoxArbitrumAssetId]: {
    stakingContract: RFOX_ARB_UNI_V2_ETH_FOX_PROXY_CONTRACT,
    chainId: arbitrumChainId,
    networkId: arbitrum.id,
    rewardAssetId: thorchainAssetId,
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
