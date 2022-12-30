import { osmosisGetLpTokensUrl, osmosisGetTokensUrl } from './index'
import { fetchData, parseData, writeFiles } from './utils'

const main = async () => {
  const data = await fetchData({
    tokensUrl: osmosisGetTokensUrl,
    lpTokensUrl: osmosisGetLpTokensUrl,
  })
  const output = parseData(data)
  await writeFiles(output)
}

main()
