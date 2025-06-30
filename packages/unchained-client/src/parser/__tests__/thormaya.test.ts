import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as mayachain from '../mayachain'
import * as thorchain from '../thorchain'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: mocks.get,
    })),
  }

  return {
    default: mockAxios,
  }
})

const thorchainParser = new thorchain.Parser({
  midgardUrl: '',
})

const mayachainParser = new mayachain.Parser({
  midgardUrl: '',
})

describe('parseTx', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('should parse thorchain affiliate name', async () => {
    const memos = [
      'SWAP:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ss:10',
      '=:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ss:10',
      's:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ss:10',
      'ADD:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ss:10',
      '+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ss:10',
      'a:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ss:10',
      'LOAN+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:10:ss',
      '$+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:10:ss',
      'POOL-:10000:ss:10',
    ]

    for (const memo of memos) {
      expect(await thorchainParser.parse(memo, '')).toMatchObject({ data: { parser: 'thorchain' } })
      expect(await mayachainParser.parse(memo, '')).toBeUndefined()
    }
  })

  it('should parse mayachain affiliate name', async () => {
    const memos = [
      'SWAP:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ssmaya:10',
      '=:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ssmaya:10',
      's:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:0/10/0:ssmaya:10',
      'ADD:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ssmaya:10',
      '+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ssmaya:10',
      'a:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:ssmaya:10',
    ]

    for (const memo of memos) {
      expect(await mayachainParser.parse(memo, '')).toMatchObject({ data: { parser: 'mayachain' } })
      expect(await thorchainParser.parse(memo, '')).toBeUndefined()
    }
  })

  it('should not parse unsupported mayachain actions', async () => {
    const memos = [
      'LOAN+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:10:ssmaya',
      '$+:ETH.ETH:0xe6a30f4f3bad978910e2cbb4d97581f5b5a0ade0:10:ssmaya',
      'POOL-:10000:ssmaya:10',
      'POOL+',
      'LOAN-',
      '$-',
      'TCY',
      'TCY+',
      'TCY-',
    ]

    for (const memo of memos) {
      expect(await mayachainParser.parse(memo, '')).toBeUndefined()
    }
  })

  it('should parse unsupported mayachain actions as thorchain without needing to query midgard', async () => {
    const memos = ['LOAN+', '$+', 'POOL-', 'POOL+', 'LOAN-', '$-', 'TCY', 'TCY+', 'TCY-']

    for (const memo of memos) {
      expect(await thorchainParser.parse(memo, '')).toMatchObject({ data: { parser: 'thorchain' } })
      expect(await mayachainParser.parse(memo, '')).toBeUndefined()
    }

    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('should parse unknown affiliate name', async () => {
    const memo = 'SWAP'

    mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))
    expect(await thorchainParser.parse(memo, '')).toMatchObject({ data: { parser: 'thorchain' } })
    mocks.get.mockImplementation(() => ({ data: { actions: [] } }))
    expect(await mayachainParser.parse(memo, '')).toBeUndefined()

    mocks.get.mockImplementation(() => ({ data: { actions: [] } }))
    expect(await thorchainParser.parse(memo, '')).toBeUndefined()
    mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))
    expect(await mayachainParser.parse(memo, '')).toMatchObject({ data: { parser: 'mayachain' } })

    mocks.get.mockImplementation(() => ({ data: { actions: [] } }))
    expect(await thorchainParser.parse(memo, '')).toBeUndefined()
    expect(await mayachainParser.parse(memo, '')).toBeUndefined()
  })
})
