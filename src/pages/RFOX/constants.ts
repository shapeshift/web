import {
  FOX_STAKING_V1_ABI,
  RFOX_PROXY_CONTRACT,
  viemClientByNetworkId,
} from '@shapeshiftoss/contracts'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'

export const setRuneAddressEvent = getAbiItem({ abi: FOX_STAKING_V1_ABI, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: FOX_STAKING_V1_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: FOX_STAKING_V1_ABI, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: FOX_STAKING_V1_ABI, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmPYuHffJfCQuexWJYv4CpukhRAyw3YM8MJbCZ34ZGda3n'

const client = viemClientByNetworkId[arbitrum.id]

export const contract = getContract({
  address: RFOX_PROXY_CONTRACT,
  abi: FOX_STAKING_V1_ABI,
  client,
})
