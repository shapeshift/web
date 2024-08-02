import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { getAbiItem, getContract } from 'viem'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'

export const setRuneAddressEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmPY36xH6HnNTUEGwogsCJoxQLmDFKZZ662DYDEcqpJDSo'

const client = viemClientByNetworkId[arbitrum.id]

export const contract = getContract({
  address: RFOX_PROXY_CONTRACT_ADDRESS,
  abi: foxStakingV1Abi,
  client,
})
