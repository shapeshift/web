import { coingeckoUrl } from './index'
import { fetchData, parseData } from './utils'
import { writeFiles } from './writeFiles'

const main = async () => {
  const data = await fetchData(coingeckoUrl)
  const output = parseData(data)
  await writeFiles(output)
}

main()
