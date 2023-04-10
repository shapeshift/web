import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData()
  const output = parseData(data)
  await writeFiles(output)
}

main()
