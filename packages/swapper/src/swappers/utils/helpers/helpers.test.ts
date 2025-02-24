import { thorchainChainId } from '@shapeshiftmonorepo/caip'
import type { EvmChainId } from '@shapeshiftmonorepo/types'
import { describe, expect, it } from 'vitest'

import { getTreasuryAddressFromChainId } from './helpers'

describe('getTreasuryAddressFromChainId', () => {
  it('throws for unsupported chains', () => {
    expect(() => getTreasuryAddressFromChainId(thorchainChainId as EvmChainId)).toThrow(
      '[getTreasuryAddressFromChainId] - Unsupported chainId',
    )
  })
})
