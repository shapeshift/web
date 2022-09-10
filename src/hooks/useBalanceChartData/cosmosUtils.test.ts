import { merge } from 'lodash'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { excludeTransaction } from './cosmosUtils'

const mockTx = (obj?: { parser?: string; method?: string }) =>
  ({
    data: merge(
      {
        parser: 'cosmos',
        method: 'delegate',
      },
      obj,
    ),
  } as Tx)

describe('cosmosUtils', () => {
  describe('excludeTransaction', () => {
    it.each([[undefined], [{ method: 'begin_unbonding' }]])('should return false for %O', args => {
      expect(excludeTransaction(mockTx(args))).toBe(true)
    })

    it.each([[{ parser: 'bitcoin' }], [{ method: 'normal_tx' }]])(
      'should return true for %O',
      args => {
        expect(excludeTransaction(mockTx(args))).toBe(false)
      },
    )
  })
})
