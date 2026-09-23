import { bnOrZero } from '@shapeshiftoss/utils'

const BUTTERSWAP_AFFILIATE = 'shapeshift'

// Worst-case router energy (p90 of recent mainnet calls), for token quotes whose allowance isn't
// granted yet
export const BUTTERSWAP_TRON_FALLBACK_SWAP_ENERGY = '450000'

// Format is `<nickname>[:rate]`, where rate is in basis points (e.g. `shapeshift:60` = 0.6%).
export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (bnOrZero(affiliateBps).lte(0)) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
