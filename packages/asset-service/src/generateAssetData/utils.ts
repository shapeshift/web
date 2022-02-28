import { BaseAsset, TokenAsset } from '@shapeshiftoss/types'
import filter from 'lodash/filter'

export const filterBlacklistedAssets = <T extends BaseAsset | TokenAsset>(
  blacklist: string[],
  assets: T[]
) => {
  const isBaseAsset = (asset: BaseAsset | TokenAsset): asset is BaseAsset =>
    Boolean((asset as BaseAsset)?.tokens)

  const filteredAssets = filter(assets, (token) => {
    if (isBaseAsset(token) && token.tokens) {
      token.tokens = filterBlacklistedAssets(blacklist, token.tokens)
    }

    return !blacklist.includes(token.caip19)
  })

  return filteredAssets
}
