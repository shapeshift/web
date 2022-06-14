import { getData, parseData, writeFiles } from './utils'

// To run, install ts-node globally `npm i -g ts-node`
// From the caip package root. Run `ts-node ./src/adapters/coinbase/generate.ts`
const main = async () => {
  const coinbaseCurrencies = await getData()
  const output = parseData(coinbaseCurrencies)
  await writeFiles(output)
}

main()
