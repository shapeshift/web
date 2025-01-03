import { RFOX_ABI, RFOX_PROXY_CONTRACT, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'

export const setRuneAddressEvent = getAbiItem({ abi: RFOX_ABI, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: RFOX_ABI, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: RFOX_ABI, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmbNwYDp4whpeqWxr6qYmCv9dsyLPYpCrQ1eY6yRFKsUMK'

const client = viemClientByNetworkId[arbitrum.id]

export const contract = getContract({
  address: RFOX_PROXY_CONTRACT,
  abi: RFOX_ABI,
  client,
})
