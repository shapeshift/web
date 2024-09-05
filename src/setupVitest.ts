import 'module-alias/register'

import moduleAlias from 'module-alias'
import path from 'path'
import { beforeAll, vi } from 'vitest'

// Redirect 'ethers' imports to 'ethers5' only for specific modules
moduleAlias.addAlias('ethers', (fromPath: string) => {
  const regex = /@shapeshiftoss\/hdwallet-(ledger|shapeshift-multichain)/
  if (regex.test(fromPath)) return path.resolve(__dirname, '../node_modules/ethers5')
  return 'ethers'
})

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_MIXPANEL', 'false')
})

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers')
vi.mock('@shapeshiftoss/hdwallet-ledger', () => ({
  isLedger: vi.fn().mockReturnValue(false),
}))
