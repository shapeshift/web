import type { Asset } from '@shapeshiftoss/types'

const colorThief = require('colorthief') as any

const toHex = (num: number): string => num.toString(16).toUpperCase().padStart(2, '0')

export const setColors = async (assets: Asset[]): Promise<Asset[]> => {
  const filteredAssets = assets.filter(asset => asset.color === '#FFFFFF' && asset.icon)

  for await (const [index, asset] of filteredAssets.entries()) {
    try {
      // No icon, no color :shrugs:
      if (!asset.icon) break
      // Don't generate colors for pool assets, or this will run for a very long time in CI and eventually fail
      // Many pool assets also just happen to have webp/svg icons which colorThief can't handle because of inherent get-pixels limitations
      if (asset.isPool) break
      // Only generate colors for assets that have a default white background (i.e don't have a custom color generated yet)
      if (asset.color !== '#FFFFFF') break

      // colorThief.getColor returns the most dominant color in the icon.
      const [r, g, b] = await colorThief.getColor(asset.icon)
      const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
      asset.color = hexColor
    } catch (err) {
      console.error(err)
      console.info(
        `${index + 1}/${filteredAssets.length} Could not get color for ${asset.assetId} iconUrl: ${
          asset.icon
        }`,
      )
    }
  }
  return assets
}
