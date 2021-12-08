import fs from 'fs'

import { findAll } from '..'

const generateMarketCapData = async () => {
  const marketCapData = await findAll()
  await fs.promises.writeFile(
    `./src/coingecko/cachedMarketCapData.json`,
    JSON.stringify(marketCapData)
  )
  console.info('Generated CoinGecko market cap data.')
}

generateMarketCapData()
