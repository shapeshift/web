import { describe, expect, it } from 'vitest'

import { addFinalAssetLimitToMemo } from './addFinalAssetLimitToMemo'

describe('addFinalAssetLimitToMemo', () => {
  describe('swap', () => {
    it('should add final asset limit to swap memo without one', () => {
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01'
      const modifiedMemo1 = addFinalAssetLimitToMemo({
        memo: memo1,
        finalAssetLimit: '100001',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01:100001',
      )
    })

    it('should not add final asset limit to swap memo already having one', () => {
      const memo1 =
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01:100001'
      const modifiedMemo1 = addFinalAssetLimitToMemo({
        memo: memo1,
        finalAssetLimit: '99992',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01:100001',
      )
    })
  })
})
