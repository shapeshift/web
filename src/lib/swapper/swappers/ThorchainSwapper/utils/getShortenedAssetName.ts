import assert from 'assert'

import thorAssetMap from '../generated/generatedTradableThorAssetMap.json'
import { shortenedNativeAssetNameByNativeAssetName } from './longTailHelpers'

const MINIMUM_UNIQUE_SUBSTRING = 2

export const getShortenedAssetName = (assetName: string): string => {
  const shortenedAssetName =
    shortenedNativeAssetNameByNativeAssetName[
      assetName as keyof typeof shortenedNativeAssetNameByNativeAssetName
    ]

  if (shortenedAssetName) return shortenedAssetName

  const thorAssets = Object.keys(thorAssetMap)

  const [asset, address] = assetName.split('-')

  assert(asset !== undefined, 'invalid asset')

  const matches = thorAssets.filter(thorAsset => thorAsset.includes(asset))

  if (matches.length === 1) return asset

  if (address) {
    const thorAssetAddresses = thorAssets
      .map(thorAsset => thorAsset.split('-')[1] ?? '')
      .filter(_address => _address)

    for (let length = MINIMUM_UNIQUE_SUBSTRING; length <= address.length; length++) {
      const suffix = address.slice(-length)
      const matches = thorAssetAddresses.filter(_address => _address.slice(-length) === suffix)
      if (matches.length === 1) return `${asset}-${suffix}`
    }
  }

  return assetName
}
