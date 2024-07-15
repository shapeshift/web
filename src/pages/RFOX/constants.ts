import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { getAbiItem } from 'viem'

export const setRuneAddressEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'SetRuneAddress' })
export const stakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Stake' })
export const unstakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Unstake' })
export const withdrawEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Withdraw' })

export const IPFS_GATEWAY = 'https://gateway.shapeshift.com/ipfs'

export const CURRENT_EPOCH_IPFS_HASH = 'QmPWBaWE7WqYmv88ayi2NTbmEfkuxwaogKGVDmQes9U6jd'
