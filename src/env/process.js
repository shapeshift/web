// This is a thin wrapper around the process/browser.js module which assigns the contents of
// env.json to process.env and freezes things to prevent shenanigans. See react-app-rewired.config.js
// for details.
const process = require('process/browser.js')
Object.freeze(Object.assign(process.env, require('./env.json')))
module.exports = Object.freeze(process)
