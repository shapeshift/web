import { describe, expect, it } from 'vitest'

import { addFinalAssetContractToMemo } from './addFinalAssetContractToMemo'

describe('addFinalAssetContractToMemo', () => {
  describe('swap', () => {
    it('should add final asset contract address to swap memo without one', () => {
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47'
      const modifiedMemo1 = addFinalAssetContractToMemo({
        memo: memo1,
        finalAssetContract: 'ec01',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01',
      )
    })

    it('should not add final asset contract address to swap memo already having one', () => {
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01'
      const modifiedMemo1 = addFinalAssetContractToMemo({
        memo: memo1,
        finalAssetContract: 'ec02',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01',
      )
    })
  })
})
