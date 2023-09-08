import type { Asset } from 'lib/asset-service'

const colorThief = require('colorthief') as any

const toHex = (num: number): string => num.toString(16).toUpperCase().padStart(2, '0')

export const setColors = async (assets: Asset[]): Promise<Asset[]> => {
  const filteredAssets = assets.filter(asset => asset.color === '#FFFFFF' && asset.icon)

  for await (const [index, asset] of filteredAssets.entries()) {
    try {
      if (asset.color === '#FFFFFF' && asset.icon) {
        // colorThief.getColor returns the most dominant color in the icon.
        const [r, g, b] = await colorThief.getColor(asset.icon)
        const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
        asset.color = hexColor
      }
    } catch (err) {
      console.info(
        `${index + 1}/${filteredAssets.length} Could not get color for ${asset.assetId} iconUrl: ${
          asset.icon
        }`,
      )
    }
  }
  return assets
}
