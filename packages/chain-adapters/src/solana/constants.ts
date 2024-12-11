// Here we take Jupiter as an example, they add an extra 40% buffer to the computed units to help with the volatility of the network
// This will permit to have a more stable and reliable estimation of the transaction cost and avoid getting the TX reverted or not picked up
// https://station.jup.ag/docs/apis/troubleshooting#transaction-confirmation-timeout
export const SOLANA_COMPUTE_UNITS_BUFFER_MULTIPLIER = 1.4

export const SOLANA_MINIMUM_INSTRUCTION_COUNT = 3

// @TODO: This is the current returned value from getMinimumBalanceForRentExemption,
// this could change if they update it, it would be safer to use unchained by consumming getMinimumBalanceForRentExemption
// Backpack is also using this value in the same way (https://github.com/coral-xyz/backpack/blob/5a538a41d060d2c48507007f96c766483115aecc/packages/common/src/constants.ts#L433)
export const SOLANA_MINIMUM_RENT_EXEMPTION_LAMPORTS = 890880
