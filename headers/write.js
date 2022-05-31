const fs = require('fs')
const { headers } = require('./')

fs.writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`,
)
