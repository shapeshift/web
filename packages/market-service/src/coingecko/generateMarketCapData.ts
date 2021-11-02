import fs from 'fs'

import { getByMarketCap } from '..'

const generateMarketCapData = async () => {
  const marketCapData = await getByMarketCap()
  await fs.promises.writeFile(
    `./src/coingecko/cachedMarketCapData.json`,
    JSON.stringify(marketCapData)
  )
  console.info('Generated CoinGecko market cap data.')
}

generateMarketCapData()
