// Codegen-only, run by generate.ts. `fs` lives here rather than in `utils.ts` so
// that re-exporting from `utils.ts` can never pull a Node built-in into the graph
// browser bundlers reach from the package entry.
import fs from 'fs'

export const writeFiles = async (data: Record<string, Record<string, string>>): Promise<void> => {
  const path = './src/adapters/coincap/generated/'
  const file = '/adapter.json'
  const writeFile = async ([k, v]: [string, unknown]): Promise<void> =>
    await fs.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v))
  await Promise.all(Object.entries(data).map(writeFile))
  console.info('Generated CoinCap AssetId adapter data.')
}
