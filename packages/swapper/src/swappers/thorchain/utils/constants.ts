export const MAX_THORCHAIN_TRADE = '100000000000000000000000000'
export const MAX_ALLOWANCE = '100000000000000000000000000'
export const THOR_MINIMUM_PADDING = 1.2
export const THOR_ETH_GAS_LIMIT = '100000' // for sends of eth / erc20 into thorchain router
export const THORCHAIN_FIXED_PRECISION = 8 // limit values are precision 8 regardless of the chain

// These are different from THOR_ETH_GAS_LIMIT
// Used to estimate the fee thorchain will take out of the buyAsset
export const THOR_TRADE_FEE_BTC_SIZE = 1000 // used for estimating thorchain side fees
export const THOR_TRADE_FEE_ETH_GAS = 120000 // used for estimating thorchain side fees
