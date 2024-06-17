import { describe, expect, it } from 'vitest'

import { addAggregatorAddressToMemo } from './addAggregatorAddressToMemo'

describe('addAggregatorAddressToMemo', () => {
  describe('swap', () => {
    it('should add aggregator address to swap memo without one', () => {
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0'
      const modifiedMemo1 = addAggregatorAddressToMemo({
        memo: memo1,
        aggregatorAddress: '47',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47',
      )
    })

    it('should not add aggregator address to swap memo already having one', () => {
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47'
      const modifiedMemo1 = addAggregatorAddressToMemo({
        memo: memo1,
        aggregatorAddress: '47',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47',
      )
    })
  })
})
