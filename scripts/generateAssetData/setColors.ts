import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

const colorThief = require('colorthief') as any

const toHex = (num: number): string => num.toString(16).toUpperCase().padStart(2, '0')

export const setColors = async (assets: Asset[]): Promise<Asset[]> => {
  const filteredAssets = assets.filter(asset => asset.color === '#FFFFFF' && asset.icon)

  for await (const [index, asset] of filteredAssets.entries()) {
    try {
      if (asset.color === '#FFFFFF' && asset.icon) {
        // colorthief passes the argument directly to sharp, which only handles file paths — not URLs.
        // Fetch to a buffer first so sharp can process it.
        const { data } = await axios.get<ArrayBuffer>(asset.icon, { responseType: 'arraybuffer' })
        const [r, g, b] = await colorThief.getColor(Buffer.from(data))
        const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
        asset.color = hexColor
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(
        `${index + 1}/${filteredAssets.length} Could not get color for ${asset.assetId} iconUrl: ${
          asset.icon
        } — ${message}`,
      )
    }
  }
  return assets
}
