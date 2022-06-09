const tsNode = require('ts-node')
tsNode.register({
  compilerOptions: {
    module: 'CommonJS',
  },
})

module.exports = require('./react-app-rewired').default
