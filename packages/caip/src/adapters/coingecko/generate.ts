import { url } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData(url)
  const output = parseData(data)
  await writeFiles(output)
}

main()
