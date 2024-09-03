import 'module-alias/register'

import moduleAlias from 'module-alias'
import path from 'path'
import { beforeAll, vi } from 'vitest'

// Redirect 'ethers' imports to 'ethers5' only for specific modules
moduleAlias.addAlias('ethers', (fromPath: string) => {
  if (fromPath.includes('/node_modules/@shapeshiftoss/hdwallet-shapeshift-multichain')) {
    return path.resolve(__dirname, '../node_modules/ethers5')
  }
  return 'ethers'
})

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_MIXPANEL', 'false')
  vi.stubEnv('REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL', 'http://mock.com')
})

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers')
vi.mock('@shapeshiftoss/hdwallet-ledger', () => ({
  isLedger: vi.fn().mockReturnValue(false),
}))
