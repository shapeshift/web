import * as bitcoin from './bitcoin'
import * as cosmos from './cosmos'
import * as ethereum from './ethereum'
import * as foxPage from './foxPage'
import * as osmosis from './osmosis'

export const activePlugins = Object.freeze({
  bitcoin,
  cosmos,
  ethereum,
  foxPage,
  osmosis,
})
