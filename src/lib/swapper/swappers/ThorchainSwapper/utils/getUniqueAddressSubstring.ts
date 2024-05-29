import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'

export const getUniqueAddressSubstring = (destinationAddress: string, addresses: AssetId[]) => {
  const MINIMUM_UNIQUE_SUBSTRING = 2
  const addressLower = destinationAddress.toLowerCase()
  let maybeShortenedDestinationAddress = destinationAddress

  const substringOriginalMap: Record<string, number> = {}

  for (let length = MINIMUM_UNIQUE_SUBSTRING; length <= addressLower.length - 2; length++) {
    const currentSubstring = addressLower.slice(-length)

    substringOriginalMap[currentSubstring] = 0
  }

  addresses.forEach(address => {
    const assetReference = fromAssetId(address).assetReference.toLowerCase()

    Object.keys(substringOriginalMap).forEach(substring => {
      if (assetReference.includes(substring)) {
        substringOriginalMap[substring] += 1
      }
    })
  })

  for (const [substring, count] of Object.entries(substringOriginalMap)) {
    if (count === 1) {
      maybeShortenedDestinationAddress = substring
      break
    }
  }

  return maybeShortenedDestinationAddress
}
