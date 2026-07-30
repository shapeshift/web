import dotenv from 'dotenv'
import path from 'path'

import { getCoincapAssetUrl } from './index'
import { fetchData, parseData } from './utils'
import { writeFiles } from './writeFiles'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const main = async () => {
  const data = await fetchData(getCoincapAssetUrl())
  const output = parseData(data)
  await writeFiles(output)
}

main()
