import { bn, bnOrZero } from 'lib/bignumber/bignumber'

export const getMinimumCryptoHuman = (sellAssetUsdRate: string): string => {
  const minimumCryptoHuman = bn(1).dividedBy(bnOrZero(sellAssetUsdRate)).toString() // $1 worth of the sell token.
  return minimumCryptoHuman
}
