/* eslint-disable no-console */
import { writeFileSync } from 'fs'

import { getLatestSemverTag } from './utils'

const main = async () => {
  const latestTag = await getLatestSemverTag()
  const headShortCommitHash = process.env.COMMIT_SHORT_HASH // comes from cloudflare.yml
  const payload = JSON.stringify({ latestTag, headShortCommitHash }, null, 2)
  console.log(payload)
  writeFileSync('./build/metadata.json', payload)
}

main()
