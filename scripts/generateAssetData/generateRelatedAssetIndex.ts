import 'dotenv/config'

import assert from 'assert'

import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'

const main = async () => {
  try {
    // check zerion api key is set before starting, prevents getting through generateAssetIndex()
    // and then failing
    assert(
      process.env.ZERION_API_KEY !== undefined,
      'Missing Zerion API key - see readme for instructions',
    )

    await generateRelatedAssetIndex()

    console.info(
      "Done. Don't forget to add a migration to clear assets state so the new assets are loaded.",
    )
  } catch (err) {
    console.info(err)
  }
}

main()
