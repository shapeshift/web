const BUTTERSWAP_AFFILIATE = '' // TODO: add affiliate

export const makeButterSwapAffiliate = (affiliateBps: string): string | undefined => {
  if (!BUTTERSWAP_AFFILIATE) return undefined
  return `${BUTTERSWAP_AFFILIATE}:${affiliateBps}`
}
