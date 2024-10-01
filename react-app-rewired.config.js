const tsNode = require('ts-node')

tsNode.register({
  extends: './tsconfig.web.json',
  include: ['src'],
  exclude: ['packages'],
  compilerOptions: {
    module: 'CommonJS',
  },
})

module.exports = require('./react-app-rewired').default
