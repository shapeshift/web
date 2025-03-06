import { merge } from 'lodash'
import { describe, expect, it } from 'vitest'

import { excludeTransaction } from './cosmosUtils'

import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'

const mockTx = (obj?: { parser?: string; method?: string }) =>
  ({
    data: merge(
      {
        parser: 'staking',
        method: 'delegate',
      },
      obj,
    ),
  }) as Tx

describe('cosmosUtils', () => {
  describe('excludeTransaction', () => {
    it.each([[undefined], [{ method: 'begin_unbonding' }]])('should return false for %O', args => {
      expect(excludeTransaction(mockTx(args))).toBe(true)
    })

    it.each([[{ parser: 'bitcoin' }], [{ parser: 'foo', method: 'normal_tx' }]])(
      'should return true for %O',
      args => {
        expect(excludeTransaction(mockTx(args))).toBe(false)
      },
    )
  })
})
