import { describe, expect, it } from 'vitest'

import { assertAndProcessMemo } from './index'

describe('assertAndProcessMemo', () => {
  describe('swap', () => {
    it('processes with affiliate name and with fee bps', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with affiliate name and no fee bps', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss'
      let expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:'
      expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with fee bps', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::50'
      const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with affiliate name and no fee bps and swapOut parameters', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss::ae:kd:12345602'
      let expected =
        '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0:ae:kd:12345602'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:'
      expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with swapOut parameters and no affiliate name', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::50:ae:kd:12345602'
      const expected =
        '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50:ae:kd:12345602'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and no fee bps and swapOut parameters', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:::ae:kd:12345602'
      let expected =
        '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0:ae:kd:12345602'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and no fee bps', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345'
      let expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:'
      expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345::'
      expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345'
      const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with wrong affiliate name', () => {
      const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:bad:50'
      const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should throw on invalid asset', () => {
      const memo = '=::0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid destination address', () => {
      const memo = '=:ETH.ETH::9786345:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid limit standard swap', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6::ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:bad:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid limit streaming swap', () => {
      let memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6://:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:///:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0//:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:0/0/:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/0/:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:/0/0:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6://0:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('deposit savers', () => {
    it('processes with affiliate name and with fee bps', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with affiliate name and with no fee bps', () => {
      let memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss'
      let expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:'
      expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with fee bps', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::50'
      const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
      const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with no affiliate name and with no fee bps', () => {
      let memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
      let expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:'
      expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::'
      expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::'
      expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with wrong affiliate name', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::bad:50'
      const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should throw on invalid pool', () => {
      const memo = '+:::ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on paired address', () => {
      const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:bad:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('add liquidity', () => {
    it('processes with affiliate name and with fee bps', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with affiliate name and with no fee bps', () => {
      let memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss'
      let expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:'
      expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with fee bps', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::50'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with no fee bps', () => {
      let memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
      let expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:'
      expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::'
      expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:::'
      expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with paired address', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:pairedAddr:ss:50'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48:pairedAddr:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with wrong affiliate name', () => {
      const memo = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::bad:50'
      const expected = '+:ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should throw on invalid pool', () => {
      const memo = '+:::ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('withdraw savers', () => {
    it('should gracefully handle being called multiple times in a row', () => {
      const memo = '-:ETH/ETH:5000'
      const expected = '-:ETH/ETH:5000'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('should throw on invalid pool', () => {
      const memo = '-::5000'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on asset', () => {
      const memo = '-:ETH/ETH:5000:ETH/ETH'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid basis points', () => {
      let memo = '-:ETH/ETH:50000'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo = '-:ETH/ETH:-1'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('withdraw liquidity', () => {
    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo = '-:ETH.ETH:5000'
      const expected = '-:ETH.ETH:5000'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('should throw on invalid pool', () => {
      const memo = '-::5000'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid basis points', () => {
      const memo = '-:ETH/ETH:50000'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('open loan', () => {
    it('processes with affiliate name and with fee bps', () => {
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      const expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      const expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with affiliate name and with no fee bps', () => {
      let memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss'
      let expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:'
      expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with fee bps', () => {
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345::50'
      const expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with no fee bps', () => {
      let memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345'
      let expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:'
      expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345::'
      expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345'
      const expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with wrong affiliate name', () => {
      const memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:bad:50'
      const expected =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should throw on invalid asset', () => {
      const memo = '$+::0x782C14C79945caD46Fbea57bb73d796366e76147:9786345:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid destination address', () => {
      const memo = '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F::9786345:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    // TODO(gomes): revert me back in https://github.com/shapeshift/web/pull/6753
    it.skip('should throw on invalid min out', () => {
      let memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()

      memo =
        '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147:0:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })

  describe('repay loan', () => {
    it('process with affiliate name and with fee bps', () => {
      const memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:50'
      const expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with affiliate name and fee bps', () => {
      const memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:50'
      const expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('process with affiliate name and with no fee bps', () => {
      let memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss'
      let expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:'
      expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with fee bps', () => {
      const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345::50'
      const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('processes with no affiliate name and with no fee bps', () => {
      let memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345'
      let expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:'
      expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)

      memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345::'
      expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should gracefully handle being called multiple times in a row - with no affiliate name and no fee bps', () => {
      const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345'
      const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'

      const first = assertAndProcessMemo(memo)
      expect(first).toBe(expected)
      const second = assertAndProcessMemo(first)
      expect(second).toBe(expected)
      const third = assertAndProcessMemo(second)
      expect(third).toBe(expected)
      const fourth = assertAndProcessMemo(third)
      expect(fourth).toBe(expected)
    })

    it('processes with wrong affiliate name', () => {
      const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:bad:0'
      const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:0'
      expect(assertAndProcessMemo(memo)).toBe(expected)
    })

    it('should throw on invalid asset', () => {
      const memo = '$+::bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq:9786345:ss:50'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })

    it('should throw on invalid destination address', () => {
      const memo = '$-:BTC.BTC::9786345:ss:0'
      expect(() => assertAndProcessMemo(memo)).toThrow()
    })
  })
})
