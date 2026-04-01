import { describe, expect, it } from 'vitest'

import type { ParsedPsbt } from './parsePsbt'
import { parsePsbt } from './parsePsbt'

const MOCK_PSBT_BASE64 =
  'cHNidP8BAOwCAAAABF4m1+zqCpnawzA+PwzGu10n5TwhL7UhpoIvtSEraqJ0AQAAAAD/////3t9AHspDWEuzAUh5e4jBi9Co9drUPpd0okJXGSsloCkBAAAAAP////9eJtfs6gqZ2sMwPj8MxrtdJ+U8IS+1IaaCL7UhK2qidAAAAAAA/////7kNS/toNI2/z8SVwQG12kktpRu7lGUv3AWkUPP3W5bYAAAAAAD/////At0NAAAAAAAAFgAUMKa3d370Y7JejBkFRoVhAjxWvtPpAwAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAAAAAABAR+ZCgAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAEBH5sKAAAAAAAAFgAUMKa3d370Y7JejBkFRoVhAjxWvtMAAQEfvwUAAAAAAAAWABQwprd3fvRjsl6MGQVGhWECPFa+0wABAR/pAwAAAAAAABYAFDCmt3d+9GOyXowZBUaFYQI8Vr7TAAAA'

const assertParsed = (result: ParsedPsbt | null): ParsedPsbt => {
  expect(result).not.toBeNull()
  return result as ParsedPsbt
}

describe('parsePsbt', () => {
  it('should parse a valid PSBT and return inputs/outputs', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    expect(result.inputs).toHaveLength(4)
    expect(result.outputs).toHaveLength(2)
  })

  it('should derive addresses from witnessUtxo scripts', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    for (const input of result.inputs) {
      expect(input.address).toBe('bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt')
    }
  })

  it('should extract correct values from witnessUtxo', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    expect(result.inputs[0].value).toBe('2713')
    expect(result.inputs[1].value).toBe('2715')
    expect(result.inputs[2].value).toBe('1471')
    expect(result.inputs[3].value).toBe('1001')
  })

  it('should extract correct output values and addresses', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    expect(result.outputs[0].address).toBe('bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt')
    expect(result.outputs[0].value).toBe('3549')
    expect(result.outputs[1].address).toBe('bc1qxzntwam7733myh5vryz5dptpqg79d0kn80clmt')
    expect(result.outputs[1].value).toBe('1001')
  })

  it('should extract txid and vout for each input', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    for (const input of result.inputs) {
      expect(input.txid).toMatch(/^[0-9a-f]{64}$/)
      expect(typeof input.vout).toBe('number')
    }
  })

  it('should return null for invalid base64', () => {
    expect(parsePsbt('not-valid-base64!!!')).toBeNull()
  })

  it('should return null for valid base64 that is not a PSBT', () => {
    expect(parsePsbt('aGVsbG8gd29ybGQ=')).toBeNull()
  })

  it('should include version and locktime', () => {
    const result = assertParsed(parsePsbt(MOCK_PSBT_BASE64))

    expect(result.version).toBe(2)
    expect(result.locktime).toBe(0)
  })
})
