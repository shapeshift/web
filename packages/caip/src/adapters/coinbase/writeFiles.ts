// Codegen-only, run by generate.ts. `fs` lives here rather than in `utils.ts` so
// that re-exporting from `utils.ts` can never pull a Node built-in into the graph
// browser bundlers reach from the package entry.
import fs from 'fs'

import type { AssetId } from '../../index'

const writeFile = async (data: Record<AssetId, string>) => {
  const path = './src/adapters/coinbase/generated/'
  const file = 'adapter.json'
  await fs.promises.writeFile(`${path}${file}`, JSON.stringify(data, null, 2))
}

export const writeFiles = async (data: Record<AssetId, string>) => {
  await writeFile(data)
  console.info('Generated Coinbase AssetId adapter data.')
}
