/* eslint-disable no-console */
import { writeFileSync } from 'fs'

import { getHeadShortCommitHash, getLatestSemverTag } from './utils'

const main = async () => {
  const latestTag = await getLatestSemverTag()
  const headShortCommitHash = await getHeadShortCommitHash()
  const payload = JSON.stringify({ latestTag, headShortCommitHash }, null, 2)
  writeFileSync('./build/metadata.json', payload)
}

main()
