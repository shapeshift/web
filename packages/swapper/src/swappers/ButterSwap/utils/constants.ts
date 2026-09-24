import { bnOrZero } from '@shapeshiftoss/utils'

const BUTTERSWAP_AFFILIATE = 'shapeshift'

// The router's total energy per swap on mainnet (measured 902k and 976k); its deployer covers 95%
export const BUTTERSWAP_TRON_FALLBACK_SWAP_ENERGY = '1000000'
// A swapAndCall's signed size on mainnet (measured 2272 and 2400 bytes)
export const BUTTERSWAP_TRON_DEFAULT_BANDWIDTH_BYTES = 2400

// Format is `<nickname>[:rate]`, where rate is in basis points (e.g. `shapeshift:60` = 0.6%).
export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (bnOrZero(affiliateBps).lte(0)) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
