import 'dotenv/config'

import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'

const main = async () => {
  try {
    await generateRelatedAssetIndex()

    console.info(
      "Done. Don't forget to add a migration to clear assets state so the new assets are loaded.",
    )
    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
