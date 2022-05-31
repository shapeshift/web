import * as fs from 'fs'

import { headers } from './'

fs.writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`,
)
