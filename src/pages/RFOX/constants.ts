import type { AssetId } from '@shapeshiftoss/caip'
import { foxEthLpArbitrumAssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'

import { getStakingContract } from './helpers'

export const setRuneAddressEvent = getAbiItem({ abi: RFOX_ABI, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: RFOX_ABI, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmX5kgfHFM99BfaP3So2CXRBnRzZepinfjHNyRzvuXYUP5'
export const RFOX_STAKING_ASSET_IDS = [foxOnArbitrumOneAssetId, foxEthLpArbitrumAssetId]

const client = viemClientByNetworkId[arbitrum.id]

export const getRfoxContract = (stakingAssetId: AssetId) =>
  getContract({
    address: getStakingContract(stakingAssetId),
    abi: RFOX_ABI,
    client,
  })
