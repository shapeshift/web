import { ethChainId } from '@shapeshiftoss/caip'
import { beforeAll, describe, vi } from 'vitest'

import type { Api } from '../../'
import { Parser } from '../arbitrumBridge'

const makeTxParser = vi.fn(
  () =>
    new Parser({
      chainId: ethChainId,
    }),
)

describe('parseTx', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('standard', () => {})
})
