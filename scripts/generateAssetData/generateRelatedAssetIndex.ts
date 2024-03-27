import 'dotenv/config'

import { exec } from 'child_process'
import pify from 'pify'

import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'

const clearAssetsCodemodCommand = 'yarn run codemod:clear-assets-migration'

const main = async () => {
  try {
    await generateRelatedAssetIndex()
    await pify(exec)(clearAssetsCodemodCommand)

    console.info('Related assets data generated')
    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
