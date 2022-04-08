import { merge } from 'lodash'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { includeTransaction } from './cosmosUtils'

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
  describe('includeTransaction', () => {
    it.each([[undefined], [{ method: 'begin_unbonding' }]])('should return false for %O', args => {
      expect(includeTransaction(mockTx(args))).toBe(false)
    })

    it.each([[{ parser: 'bitcoin' }], [{ method: 'normal_tx' }]])(
      'should return true for %O',
      args => {
        expect(includeTransaction(mockTx(args))).toBe(true)
      },
    )
  })
})
