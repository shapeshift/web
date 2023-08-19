export const THOR_MINIMUM_PADDING = 1.2
export const THOR_EVM_GAS_LIMIT = '100000' // for sends of eth / erc20 into thorchain router
export const THORCHAIN_FIXED_PRECISION = 8 // limit values are precision 8 regardless of the chain
export const THORCHAIN_AFFILIATE_NAME = 'ss'

export const MEMO_PART_DELIMITER = ':'
export const POOL_PART_DELIMITER = '.'
export const LIMIT_PART_DELIMITER = '/'
export const DEFAULT_STREAMING_NUM_SWAPS = 0 // let network decide, see https://dev.thorchain.org/thorchain-dev/concepts/streaming-swaps
export const DEFAULT_STREAMING_INTERVAL = 10 // TODO: calc this based on pool depth https://dev.thorchain.org/thorchain-dev/concepts/streaming-swaps
