// Codegen-only, run by generate.ts. `index.ts` re-exports from `utils.ts`, so
// keeping `fs` here rather than there is what keeps Node built-ins out of the
// module graph browser bundlers reach from the package entry.
import fs from 'fs'

import type { AssetMap } from './utils'

export const writeFiles = async (data: AssetMap): Promise<void> => {
  await Promise.all(
    Object.entries(data).map(async ([chainId, assets]): Promise<void> => {
      const dirPath = `./src/adapters/coingecko/generated/${chainId}`.replace(':', '_')
      await fs.promises.mkdir(dirPath, { recursive: true })
      await fs.promises.writeFile(`${dirPath}/adapter.json`, JSON.stringify(assets))
    }),
  )
  console.info('Generated CoinGecko AssetId adapter data.')
}
