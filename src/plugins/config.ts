import { validators as bitcoinValidators } from './bitcoin/config'
import { validators as cosmosValidators } from './cosmos/config'
import { validators as ethereumValidators } from './ethereum/config'
import { validators as foxPageValidators } from './foxPage/config'
import { validators as osmosisValidators } from './osmosis/config'

export const activePluginValidators = Object.freeze({
  ...bitcoinValidators,
  ...cosmosValidators,
  ...ethereumValidators,
  ...foxPageValidators,
  ...osmosisValidators,
})
