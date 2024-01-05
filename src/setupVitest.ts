import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  ;(global as any).IS_REACT_ACT_ENVIRONMENT = true
})
vi.resetModules()
vi.mock('ethers')
