import 'dotenv/config'

import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'

const main = async () => {
  try {
    await generateRelatedAssetIndex()

    console.info(
      "Done. Don't forget to add a migration to clear assets state so the new assets are loaded.",
    )
  } catch (err) {
    console.info(err)
  }
}

main()
