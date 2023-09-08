import { coingeckoUrl } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData(coingeckoUrl)
  const output = parseData(data)
  await writeFiles(output)
}

main()
