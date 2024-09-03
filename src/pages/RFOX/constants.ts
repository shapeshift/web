import {
  foxStakingV1Abi,
  RFOX_PROXY_CONTRACT_ADDRESS,
  viemClientByNetworkId,
} from '@shapeshiftoss/contracts'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'

export const setRuneAddressEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmTr3pFd14d5RaYao7LrtFkrR5ABoa4KCQqffx9G73SA1T'

const client = viemClientByNetworkId[arbitrum.id]

export const contract = getContract({
  address: RFOX_PROXY_CONTRACT_ADDRESS,
  abi: foxStakingV1Abi,
  client,
})
