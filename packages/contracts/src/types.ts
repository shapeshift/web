import type { EVERGREEN_FARMING_ABI, FARMING_ABI } from './abis'
import type { foxEthStakingContractAddresses } from './constants'

export type FoxEthStakingContractAddress = (typeof foxEthStakingContractAddresses)[number]
export type FoxEthStakingContractAbi = typeof FARMING_ABI | typeof EVERGREEN_FARMING_ABI
