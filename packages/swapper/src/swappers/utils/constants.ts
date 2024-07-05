import { maxUint256 } from 'viem'

export const DEFAULT_SLIPPAGE = '0.002' // .2%
export const ALLOWABLE_MARKET_MOVEMENT = '0.01' // 1%

// In Solidity, the maximum value for uint256 is 2^256 - 1.
// This is the maximum value that can be stored in a uint256 variable.
export const MAX_ALLOWANCE = maxUint256.toString()
