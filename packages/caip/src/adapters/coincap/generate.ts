import { coincapAssetUrl } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData(coincapAssetUrl)
  const output = parseData(data)
  await writeFiles(output)
}

main()
