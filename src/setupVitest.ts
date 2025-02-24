import 'module-alias/register'

import { beforeAll, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('VITE_FEATURE_MIXPANEL', 'false')
})

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers6')
vi.mock('@shapeshiftoss/hdwallet-ledger', () => ({
  isLedger: vi.fn().mockReturnValue(false),
}))
