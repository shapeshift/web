import { getData, parseData } from './utils'
import { writeFiles } from './writeFiles'

const main = async () => {
  const coinbaseCurrencies = await getData()
  const output = parseData(coinbaseCurrencies)
  await writeFiles(output)
}

main()
