import { describe, expect, it } from 'vitest'

import { THORCHAIN_AFFILIATE_NAME } from '../constants'
import { addAggregatorAddressToMemo } from './addAggregatorAddressToMemo'
import { addFinalAssetAddressToMemo } from './addFinalAssetAddressToMemo'
import { addFinalAssetLimitToMemo } from './addFinalAssetLimitToMemo'
import { addLimitToMemo } from './addLimitToMemo'
import { assertAndProcessMemo } from './index'

describe('memo', () => {
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

  describe('addFinalAssetContractToMemo', () => {
    describe('swap', () => {
      it('should add final asset contract address to swap memo without one', () => {
        const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47'
        const modifiedMemo1 = addFinalAssetAddressToMemo({
          memo: memo1,
          finalAssetAddress: 'ec01',
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01',
        )
      })

      it('should not add final asset contract address to swap memo already having one', () => {
        const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01'
        const modifiedMemo1 = addFinalAssetAddressToMemo({
          memo: memo1,
          finalAssetAddress: 'ec02',
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01',
        )
      })
    })
  })

  describe('addFinalAssetLimitToMemo', () => {
    describe('swap', () => {
      it('should add final asset limit to swap memo without one', () => {
        const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01'
        const modifiedMemo1 = addFinalAssetLimitToMemo({
          memo: memo1,
          finalAssetLimit: '100001',
          affiliate: THORCHAIN_AFFILIATE_NAME,
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
          affiliate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0:47:ec01:100001',
        )
      })
    })
  })

  describe('addLimitToMemo', () => {
    describe('swap', () => {
      it('should add limit to swap memo without one', () => {
        // Memo without affiliate parts
        const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147'
        const modifiedMemo1 = addLimitToMemo({
          memo: memo1,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with affiliate name, empty limit, and 0 affiliate fee
        const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with affiliate parts
        const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '2000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo2).toBe(memo2)
      })
      it('should add zerod out affiliate parts to memo with empty affiliate/fee', () => {
        // Memo with no limit and empty affiliate parts
        const memo1 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:::'
        const modifiedMemo1 = addLimitToMemo({
          memo: memo1,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with a limit and empty affiliate parts
        const memo2 = '=:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000::'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with affiliate name, empty limit, and 0 affiliate fee
        const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with affiliate parts
        const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '2000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo2).toBe(memo2)
      })

      it('should add zerod out affiliate parts to memo with empty affiliate/fee', () => {
        // Memo with no limit and empty affiliate parts
        const memo1 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:::'
        const modifiedMemo1 = addLimitToMemo({
          memo: memo1,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo1).toBe(
          '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000:ss:0',
        )

        // Memo with a limit and empty affiliate parts
        const memo2 = '$-:ETH.ETH:0x782C14C79945caD46Fbea57bb73d796366e76147:1000000000::'
        const modifiedMemo2 = addLimitToMemo({
          memo: memo2,
          limit: '1000000000',
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
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
          affilate: THORCHAIN_AFFILIATE_NAME,
        })
        expect(modifiedMemo).toBe('-:ETH/ETH:5000::ss:0')
      })
    })
  })

  describe('assertAndProcessMemo', () => {
    describe('swap', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and no fee bps', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss'
        let expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:'
        expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::50'
        const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with affiliate name and no fee bps and swapOut parameters', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss::ae:kd:12345602'
        let expected =
          '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0:ae:kd:12345602'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:'
        expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with swapOut parameters and no affiliate name', () => {
        const memo =
          '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::50:ae:kd:12345602'
        const expected =
          '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50:ae:kd:12345602'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and no fee bps and swapOut parameters', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:::ae:kd:12345602'
        let expected =
          '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0:ae:kd:12345602'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and no fee bps', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345'
        let expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:'
        expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::'
        expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345'
        const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:bad:50'
        const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid asset', () => {
        const memo = '=::0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on missing destination address', () => {
        const memo = '=:ETH.ETH::9786345:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on invalid limit standard swap', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:bad:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on invalid limit streaming swap', () => {
        let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6://:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:///:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0//:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0/0/:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/0/:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/0/0:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6://0:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('deposit savers', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and with no fee bps', () => {
        let memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss'
        let expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:'
        expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::50'
        const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
        const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
        let expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:'
        expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::'
        expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::'
        expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::bad:50'
        const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid pool', () => {
        const memo = '+:::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on paired address', () => {
        const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:bad:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('add liquidity', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and with no fee bps', () => {
        let memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss'
        let expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:'
        expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::50'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
        let expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:'
        expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::'
        expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::'
        expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with paired address', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:pairedAddr:ss:50'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:pairedAddr:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::bad:50'
        const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid pool', () => {
        const memo = '+:::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('withdraw savers', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo = '-:ETH/ETH:5000::ss:50'
        const expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '-:ETH/ETH:5000::ss:50'
        const expected = '-:ETH/ETH:5000::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and with no fee bps', () => {
        let memo = '-:ETH/ETH:5000::ss'
        let expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH/ETH:5000::ss:'
        expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '-:ETH/ETH:5000:::50'
        const expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo = '-:ETH/ETH:5000'
        let expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH/ETH:5000:'
        expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH/ETH:5000::'
        expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH/ETH:5000:::'
        expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '-:ETH/ETH:5000'
        const expected = '-:ETH/ETH:5000::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '-:ETH/ETH:5000::bad:0'
        const expected = '-:ETH/ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid pool', () => {
        const memo = '-::5000::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on asset', () => {
        const memo = '-:ETH/ETH:5000:ETH/ETH:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on invalid basis points', () => {
        let memo = '-:ETH/ETH:50000::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo = '-:ETH/ETH:-1::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('withdraw liquidity', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo = '-:ETH.ETH:5000::ss:50'
        const expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '-:ETH.ETH:5000::ss:50'
        const expected = '-:ETH.ETH:5000::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and with no fee bps', () => {
        let memo = '-:ETH.ETH:5000::ss'
        let expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH.ETH:5000::ss:'
        expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '-:ETH.ETH:5000:::50'
        const expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo = '-:ETH.ETH:5000'
        let expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH.ETH:5000:'
        expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH.ETH:5000::'
        expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '-:ETH.ETH:5000:::'
        expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '-:ETH.ETH:5000'
        const expected = '-:ETH.ETH:5000::ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with asset', () => {
        const memo = '-:ETH.ETH:5000:ETH.ETH:ss:0'
        const expected = '-:ETH.ETH:5000:ETH.ETH:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '-:ETH.ETH:5000::bad:0'
        const expected = '-:ETH.ETH:5000::ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid pool', () => {
        const memo = '-::5000::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on invalid basis points', () => {
        const memo = '-:ETH/ETH:50000::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('open loan', () => {
      it('processes with affiliate name and with fee bps', () => {
        const memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        const expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        const expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with affiliate name and with no fee bps', () => {
        let memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss'
        let expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:'
        expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345::50'
        const expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345'
        let expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:'
        expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345::'
        expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345'
        const expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:bad:50'
        const expected =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid asset', () => {
        const memo = '$+::0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on missing destination address', () => {
        const memo = '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F::9786345:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      // TODO(gomes): revert me back in https://github.com/shapeshift/web/pull/6753
      it.skip('should throw on invalid min out', () => {
        let memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()

        memo =
          '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:0:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('repay loan', () => {
      it('process with affiliate name and with fee bps', () => {
        const memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:50'
        const expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
        const memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:50'
        const expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('process with affiliate name and with no fee bps', () => {
        let memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss'
        let expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:'
        expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with fee bps', () => {
        const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345::50'
        const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name and with no fee bps', () => {
        let memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345'
        let expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:'
        expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)

        memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345::'
        expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
        const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345'
        const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'

        const first = assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)
        expect(first).toBe(expected)
        const second = assertAndProcessMemo(first, THORCHAIN_AFFILIATE_NAME)
        expect(second).toBe(expected)
        const third = assertAndProcessMemo(second, THORCHAIN_AFFILIATE_NAME)
        expect(third).toBe(expected)
        const fourth = assertAndProcessMemo(third, THORCHAIN_AFFILIATE_NAME)
        expect(fourth).toBe(expected)
      })

      it('processes with wrong affiliate name', () => {
        const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:bad:0'
        const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on invalid asset', () => {
        const memo = '$+::bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:50'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })

      it('should throw on missing destination address', () => {
        const memo = '$-:BTC.BTC::9786345:ss:0'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('claim tcy', () => {
      it('processes with affiliate name', () => {
        const memo = 'tcy:sthor1qhm0wjsrlw8wpvzrnpj8xxqu87tcucd6h98le4:ss'
        const expected = 'tcy:sthor1qhm0wjsrlw8wpvzrnpj8xxqu87tcucd6h98le4'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with no affiliate name', () => {
        const memo = 'tcy:sthor1qhm0wjsrlw8wpvzrnpj8xxqu87tcucd6h98le4'
        const expected = 'tcy:sthor1qhm0wjsrlw8wpvzrnpj8xxqu87tcucd6h98le4'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('should throw on missing address', () => {
        const memo = 'tcy:'
        expect(() => assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toThrow()
      })
    })

    describe('stake tcy', () => {
      it('processes tcy+ memo', () => {
        const memo = 'tcy+'
        const expected = 'tcy+'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('strips additional parts', () => {
        const memo = 'tcy+:foo:bar:baz'
        const expected = 'tcy+'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })
    })

    describe('unstake tcy', () => {
      it('processes with 100% bps', () => {
        const memo = 'tcy-:10000'
        const expected = 'tcy-:10000'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('processes with 50% bps', () => {
        const memo = 'tcy-:5000'
        const expected = 'tcy-:5000'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })

      it('strips additional parts', () => {
        const memo = 'tcy-:5000:foo:bar'
        const expected = 'tcy-:5000'
        expect(assertAndProcessMemo(memo, THORCHAIN_AFFILIATE_NAME)).toBe(expected)
      })
    })
  })
})
