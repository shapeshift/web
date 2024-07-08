import { getData, parseData, writeFiles } from './utils'

const main = async () => {
  const coinbaseCurrencies = await getData()
  const output = parseData(coinbaseCurrencies)
  await writeFiles(output)
}

main()
