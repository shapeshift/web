import { beforeAll, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_MIXPANEL', 'false')
})

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers')
