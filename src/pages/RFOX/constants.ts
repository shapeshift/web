import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'

import { getStakingContract } from './helpers'

export const stakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Unstake' })

export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'bafkreietuqdzwwmxlm3mtbi7sylk2if4tq6njxh6j5dsqqjn46v4662a64'

export const RFOX_STAKING_ASSET_IDS = [foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId]

const client = viemClientByNetworkId[arbitrum.id]

export const getRfoxContract = (stakingAssetId: AssetId) =>
  getContract({
    address: getStakingContract(stakingAssetId),
    abi: RFOX_ABI,
    client,
  })
