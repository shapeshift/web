import { describe, expect, it } from 'vitest'

import { assertAndProcessMemo } from './memo' // Update this import path if necessary

describe('assertAndProcessMemo', () => {
  it('processes swap with affiliate name', () => {
    const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
    const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes swap without affiliate name', () => {
    const memo = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345'
    const expected = '=:ETH.ETH:0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6:9786345:ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes L1 savers deposit with affiliate name', () => {
    const memo = '+:BTC/BTC::ss:0'
    const expected = '+:BTC/BTC::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes L1 savers deposit without affiliate name', () => {
    const memo = '+:BTC/BTC'
    const expected = '+:BTC/BTC::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes EVM token savers deposit with affiliate name', () => {
    const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
    const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes EVM token savers deposit without affiliate name', () => {
    const memo = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
    const expected = '+:ETH/USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes longtail swap with affiliate name', () => {
    const memo = '=:DOGE.DOGE:D5ZxkWY2dwwjPhUEQBRHcb3wNamft1XGga:654517605534:ss:0'
    const expected = '=:DOGE.DOGE:D5ZxkWY2dwwjPhUEQBRHcb3wNamft1XGga:654517605534:ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes longtail swap without affiliate name', () => {
    const memo = '=:DOGE.DOGE:D5ZxkWY2dwwjPhUEQBRHcb3wNamft1XGga:654517605534'
    const expected = '=:DOGE.DOGE:D5ZxkWY2dwwjPhUEQBRHcb3wNamft1XGga:654517605534:ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes savers withdraw with affiliate name', () => {
    const memo = '-:ETH/ETH:5000::ss:0'
    const expected = '-:ETH/ETH:5000::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes savers withdraw without affiliate name', () => {
    const memo = '-:ETH/ETH:5000'
    const expected = '-:ETH/ETH:5000::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes loan open with wrong affiliate name', () => {
    const memo =
      '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::t:0'
    const expected =
      '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes loan open with affiliate name', () => {
    const memo =
      '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
    const expected =
      '$+:ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F:0x782C14C79945caD46Fbea57bb73d796366e76147::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('process loan repayment with affiliate name', () => {
    const memo = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr::ss:0'
    const expected = '$-:BTC.BTC:1JBYZbazQAh9z59jnc7fvFSj2sTzKvVsgr::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })

  it('processes loan repayment without affiliate name', () => {
    const memo = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq'
    const expected = '$-:BTC.BTC:bc1q85pgumgwvaw26j47xqt6dup5l995a9ecte9sfq::ss:0'
    expect(assertAndProcessMemo(memo)).toBe(expected)
  })
})
