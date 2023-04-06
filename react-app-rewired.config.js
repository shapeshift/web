const tsNode = require('ts-node')
tsNode.register({
  extends: './tsconfig.web.json',
  include: ['src', 'cypress'],
  exclude: ['packages'],
  compilerOptions: {
    module: 'CommonJS',
  },
  watchOptions: {
    excludeDirectories: ["packages"]
  }
})

module.exports = require('./react-app-rewired').default
