import { coincapUrl } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData(coincapUrl)
  const output = parseData(data)
  await writeFiles(output)
}

main()
