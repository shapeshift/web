const BUTTERSWAP_AFFILIATE = 'shapeshift'

export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (!BUTTERSWAP_AFFILIATE) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
