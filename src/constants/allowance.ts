// Need to limit the max allowance to 96 bits because contracts like Uniswap and Compound have a
// 96 bit max allowance.
export const MAX_ALLOWANCE = '0xffffffffffffffffffffffff'
