import type { AugmentedYieldDto } from './types'

const VAULT_CURATORS = [
  'Steakhouse High Yield',
  'Steakhouse Prime',
  'Steakhouse',
  'Gauntlet',
  'Clearstar',
  'Yearn OG',
  'Yearn',
  'Re7',
  'Usual',
  'Smokehouse',
]

export const getYieldDisplayName = (yieldItem: AugmentedYieldDto): string => {
  const { token, providerId, metadata } = yieldItem
  const metadataName = metadata?.name ?? ''

  const isVaultWithCurator =
    providerId === 'morpho' ||
    metadataName.includes('Morpho Vault') ||
    metadataName.includes('Yearn Vault')

  if (isVaultWithCurator) {
    const curator = VAULT_CURATORS.find(c => metadataName.startsWith(c))
    if (curator) return curator
  }

  return token.symbol
}
