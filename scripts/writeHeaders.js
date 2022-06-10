const fs = require('fs')
const tsNode = require('ts-node')
tsNode.register({
  compilerOptions: {
    module: 'CommonJS',
  },
})

const { headers } = require('../react-app-rewired/headers')

fs.writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`,
)
