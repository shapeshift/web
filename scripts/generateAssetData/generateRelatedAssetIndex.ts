import 'dotenv/config'

import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'

const main = async () => {
  try {
    await generateRelatedAssetIndex(true)

    console.info('Related assets data generated')
    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
