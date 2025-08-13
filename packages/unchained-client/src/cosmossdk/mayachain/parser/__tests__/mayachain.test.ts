import { mayachainAssetId, mayachainChainId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import mayachainStreamingSwap from './mockData/mayachainStreamingSwap'
import mayachainStreamingSwapOutbound from './mockData/mayachainStreamingSwapOutbound'
import mayachainSwap from './mockData/mayachainSwap'
import mayachainSwapOutbound from './mockData/mayachainSwapOutbound'
import mayachainSwapRefund from './mockData/mayachainSwapRefund'
import standard from './mockData/standard'

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

const txParser = new TransactionParser({
  chainId: mayachainChainId,
  assetId: mayachainAssetId,
  midgardUrl: '',
})

describe('parseTx', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('should be able to parse a standard send tx', async () => {
    const { tx } = standard
    const address = 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      fee: {
        assetId: mayachainAssetId,
        value: '2000000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7',
          assetId: mayachainAssetId,
          totalValue: '43980000000000',
          components: [{ value: '43980000000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a standard receive tx', async () => {
    const { tx } = standard
    const address = 'maya1a7gg93dgwlulsrqf6qtage985ujhpu068zllw7'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '43980000000000',
          components: [{ value: '43980000000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse swap', async () => {
    const { tx } = mayachainSwap
    const address = 'maya1g7c6jt5ynd5ruav2qucje0vuaan0q5xwasswts'
    const memo = '=:r:thor1g7c6jt5ynd5ruav2qucje0vuaan0q5xwa8wzaq:254019012804:_/ts:5/50'

    mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      fee: {
        assetId: mayachainAssetId,
        value: '2000000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
          assetId: mayachainAssetId,
          totalValue: '236116842871614',
          components: [{ value: '236116842871614' }],
        },
      ],
      data: {
        parser: 'mayachain',
        memo,
        method: 'swap',
        swap: { type: 'Standard' },
      },
      trade: { dexName: Dex.Maya, memo, type: TradeType.Swap },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse swap outbound', async () => {
    const { tx, actionsResponse } = mayachainSwapOutbound
    const address = 'maya17wlyzcfr36dt0uvflrmghpclwlvcml2zzfqzjt'
    const memo = 'OUT:DFC6E5DF9FCBB7E62E1B69FB8D40E8F803E2958064C4337FD19C1BFF48D0D0B6'

    mocks.get.mockImplementation(() => ({ data: actionsResponse }))

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '22372670383519',
          components: [{ value: '22372670383519' }],
        },
      ],
      data: {
        parser: 'mayachain',
        memo,
        originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
        method: 'swapOut',
        swap: { type: 'Standard' },
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse swap refund', async () => {
    const { tx, actionsResponse } = mayachainSwapRefund
    const address = 'maya18z343fsdlav47chtkyp0aawqt6sgxsh3vjy2vz'
    const memo = 'REFUND:DD08D4EF686857E97C7134226996AF590E2CDE0015E8961347D3A668CCF99106'

    mocks.get.mockImplementation(() => ({ data: actionsResponse }))

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '6303170239596',
          components: [{ value: '6303170239596' }],
        },
      ],
      data: {
        parser: 'mayachain',
        memo,
        originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
        method: 'swapRefund',
        swap: { type: 'Standard' },
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse streaming swap', async () => {
    const { tx } = mayachainStreamingSwap
    const address = 'maya1ytvlu6lpzudrr7tsg64mzqclhdvk4pzkhcaay2'
    const memo = '=:ETH.USDT:0xeba7239d9758f131b19797a56543e7daa8aa922e:266949978401/3/0:wr:125'

    mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      fee: {
        assetId: mayachainAssetId,
        value: '2000000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
          assetId: mayachainAssetId,
          totalValue: '130000000000000',
          components: [{ value: '130000000000000' }],
        },
      ],
      data: {
        parser: 'mayachain',
        memo,
        method: 'swap',
        swap: { type: 'Streaming' },
      },
      trade: { dexName: Dex.Maya, memo, type: TradeType.Swap },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse streaming swap outbound', async () => {
    const { tx, actionsResponse } = mayachainStreamingSwapOutbound
    const address = 'maya1cups30hy0e54l8mrwux7707r7quk2syzhggjcy'
    const memo = 'OUT:05132046F53E17F12DAA30C4BB1D970210D7309F86FA67D06B04EBB02FA82409'

    mocks.get.mockImplementation(() => ({ data: actionsResponse }))

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: mayachainChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'maya1g98cy3n9mmjrpn0sxmn63lztelera37n8yyjwl',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '65918546170682',
          components: [{ value: '65918546170682' }],
        },
      ],
      data: {
        parser: 'mayachain',
        memo,
        originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
        method: 'swapOut',
        swap: { type: 'Streaming' },
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })
})
