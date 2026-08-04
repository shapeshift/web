import { bnOrZero } from '@shapeshiftoss/utils'

const BUTTERSWAP_AFFILIATE = 'shapeshift'

// Format is `<nickname>[:rate]`, where rate is in basis points (e.g. `shapeshift:60` = 0.6%).
export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (bnOrZero(affiliateBps).lte(0)) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
