import assert from 'assert'
import path from 'path'

export const getTenderlyRpcUrl = () => {
  const { level, msg } = require(path.join(__dirname, '../.tenderly.json'))

  assert(level === 'info', 'received bad tenderly devnet metadata')

  return msg
}
