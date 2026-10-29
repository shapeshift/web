import { coingeckoUrl } from './index'
import { fetchData, parseData, rekeyAptosPairedFungibleAssets } from './utils'
import { writeFiles } from './writeFiles'

const main = async () => {
  const data = await fetchData(coingeckoUrl)
  const output = await rekeyAptosPairedFungibleAssets(parseData(data))
  await writeFiles(output)
}

main()
