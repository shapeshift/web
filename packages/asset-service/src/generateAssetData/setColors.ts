import { Asset } from '@shapeshiftoss/types'
import colorThief from 'colorthief'

const toHex = (num: number): string => num.toString(16).toUpperCase().padStart(2, '0')

export const setColors = async (assets: Asset[]): Promise<Asset[]> => {
  for await (const [index, asset] of assets.entries()) {
    try {
      if (asset.color === '#FFFFFF' && asset.icon) {
        // colorThief.getColor returns the most dominant color in the icon.
        const [r, g, b] = await colorThief.getColor(asset.icon)
        const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
        asset.color = hexColor
      }
    } catch (err) {
      console.info(
        `${index + 1}/${assets.length} Could not get color for ${asset.assetId} iconUrl: ${
          asset.icon
        }`
      )
    }
  }
  return assets
}
