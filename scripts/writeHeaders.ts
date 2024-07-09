import fs from 'node:fs'

import { headers } from '../react-app-rewired/headers'

fs.writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`,
)
