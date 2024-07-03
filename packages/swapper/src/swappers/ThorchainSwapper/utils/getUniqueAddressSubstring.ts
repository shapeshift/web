import { type AssetId } from '@shapeshiftoss/caip'

export const getUniqueAddressSubstring = (
  destinationAssetId: AssetId,
  longTailAssetIds: AssetId[],
) => {
  const MINIMUM_UNIQUE_SUBSTRING = 2
  let maybeShortenedDestinationAddress = destinationAssetId

  const substringsCount: Record<string, number> = {}

  for (let length = MINIMUM_UNIQUE_SUBSTRING; length <= destinationAssetId.length - 2; length++) {
    const currentSubstring = destinationAssetId.slice(-length)
    substringsCount[currentSubstring] = 0
  }

  longTailAssetIds.forEach(assetId => {
    Object.keys(substringsCount).forEach(substring => {
      if (assetId.includes(substring)) {
        substringsCount[substring] += 1
      }
    })
  })

  for (const [substring, count] of Object.entries(substringsCount)) {
    if (count === 1) {
      maybeShortenedDestinationAddress = substring
      break
    }
  }

  return maybeShortenedDestinationAddress
}
