import * as _ from 'lodash'
import * as webpack from 'webpack'

const progressHandler = (percentage: number, msg = '', details = '') => {
  const p = _.padStart((percentage * 100).toFixed(1), 5)
  const m = _.padEnd(msg, 12)
  process.stdout.write(`\x1b[32m${p}%\x1b[1m\t${m}\x1b[0m\t${details}\n`)
}

const buildingHandler = _.throttle(progressHandler, 500, { leading: true, trailing: false })

let lastMsg = ''

export const progressPlugin = new webpack.ProgressPlugin({
  activeModules: true,
  handler: (percentage, msg, details) => {
    if (lastMsg !== msg) {
      progressHandler(percentage, msg, details)
    } else {
      buildingHandler(percentage, msg, details)
    }
    lastMsg = msg
  },
})
