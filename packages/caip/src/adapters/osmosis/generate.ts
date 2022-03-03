import { osmosisUrl } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData(osmosisUrl)
  const output = parseData(data)
  await writeFiles(output)
}

main()
