// Need to limit the max allowance to 96 bits because contracts like Uniswap and Compound have a
// will revert the transaction if giving allowance more than 96 bits.
export const MAX_ALLOWANCE = '0xffffffffffffffffffffffff'
