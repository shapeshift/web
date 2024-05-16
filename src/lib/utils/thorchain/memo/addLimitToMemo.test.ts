import { describe, expect, it } from 'vitest'

import { addLimitToMemo } from './addLimitToMemo'

describe('addLimitToMemo', () => {
  describe('swap', () => {
    it('should add limit to swap memo without one', () => {
      // Memo without affiliate parts
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '1000000000',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with affiliate name, empty limit, and 0 affiliate fee
      const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '1000000000',
      })
      expect(modifiedMemo2).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )
    })

    it('should not add limit to swap memo already having one', () => {
      // Memo without affiliate parts
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '2000000000',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with affiliate parts
      const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '2000000000',
      })
      expect(modifiedMemo2).toBe(memo2)
    })
    it('should add zerod out affiliate parts to memo with empty affiliate/fee', () => {
      // Memo with no limit and empty affiliate parts
      const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:::'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '1000000000',
      })
      expect(modifiedMemo1).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with a limit and empty affiliate parts
      const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000::'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '1000000000',
      })
      expect(modifiedMemo2).toBe(
        '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )
    })
  })

  describe('loan open', () => {
    it('should add minimum debt to loan open memo without one', () => {
      // Memo without affiliate parts
      const memo1 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '42',
      })
      expect(modifiedMemo1).toBe(
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0',
      )

      // Memo with affiliate name, empty limit, and 0 affiliate fee
      const memo2 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '42',
      })
      expect(modifiedMemo2).toBe(
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0',
      )
    })

    it('should not add minimum debt to loan open memo already having one', () => {
      // Memo without affiliate parts
      const memo1 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '1337',
      })
      expect(modifiedMemo1).toBe(
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0',
      )

      // Memo with affiliate parts
      const memo2 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '1337',
      })
      expect(modifiedMemo2).toBe(memo2)
    })

    it('should add zerod out affiliate parts to memo with empty affiliate/fee', () => {
      // Memo with no limit and empty affiliate parts
      const memo1 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:::'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '42',
      })
      expect(modifiedMemo1).toBe(
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0',
      )

      // Memo with a limit and empty affiliate parts
      const memo2 =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42::'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '42',
      })
      expect(modifiedMemo2).toBe(
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:42:ss:0',
      )
    })
  })

  describe('loan repay', () => {
    it('should add minimum collateral to loan repay memo without one', () => {
      // Memo without affiliate parts
      const memo1 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '1000000000',
      })
      expect(modifiedMemo1).toBe(
        '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with affiliate name, empty limit, and 0 affiliate fee
      const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '1000000000',
      })
      expect(modifiedMemo2).toBe(
        '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )
    })

    it('should not add minimum collateral to loan repay memo already having one', () => {
      // Memo without affiliate parts
      const memo1 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '2000000000',
      })
      expect(modifiedMemo1).toBe(
        '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with affiliate parts
      const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '2000000000',
      })
      expect(modifiedMemo2).toBe(memo2)
    })

    it('should add zerod out affiliate parts to memo with empty affiliate/fee', () => {
      // Memo with no limit and empty affiliate parts
      const memo1 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:::'
      const modifiedMemo1 = addLimitToMemo({
        memo: memo1,
        limit: '1000000000',
      })
      expect(modifiedMemo1).toBe(
        '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )

      // Memo with a limit and empty affiliate parts
      const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000::'
      const modifiedMemo2 = addLimitToMemo({
        memo: memo2,
        limit: '1000000000',
      })
      expect(modifiedMemo2).toBe(
        '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
      )
    })
  })

  describe('add liquidity', () => {
    it('should not add limit to add liquidity memo', () => {
      const memo = 'ADD:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:ss:0'
      const modifiedMemo = addLimitToMemo({
        memo,
        limit: '1000000000',
      })
      expect(modifiedMemo).toBe(memo)
    })
  })

  describe('withdraw liquidity', () => {
    it('should not add limit to withdraw liquidity memo', () => {
      const memo = '-:ETH.ETH:5000::ss:0'
      const modifiedMemo = addLimitToMemo({
        memo,
        limit: '1000000000',
      })
      expect(modifiedMemo).toBe(memo)
    })
  })

  describe('savers deposit', () => {
    it('should not add limit to savers deposit memo', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      const modifiedMemo = addLimitToMemo({
        memo,
        limit: '1000000000',
      })
      expect(modifiedMemo).toBe(memo)
    })
  })

  describe('savers withdraw', () => {
    it('should not add limit to savers withdraw memo', () => {
      const memo = '-:ETH/ETH:5000::ss:50'
      const modifiedMemo = addLimitToMemo({
        memo,
        limit: '1000000000',
      })
      expect(modifiedMemo).toBe('-:ETH/ETH:5000::ss:0')
    })
  })
})
