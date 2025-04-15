import { mayachainAssetId, mayachainChainId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import type { Fee } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import mayachainLpDeposit from './mockData/mayachainLpDeposit'
import mayachainLpRefund from './mockData/mayachainLpRefund'
import mayachainLpWithdraw from './mockData/mayachainLpWithdraw'
import mayachainRefund from './mockData/mayachainRefund'
import mayachainStreamingSwap from './mockData/mayachainStreamingSwap'
import mayachainStreamingSwapOutbound from './mockData/mayachainStreamingSwapOutbound'
import mayachainStreamingSwapRefund from './mockData/mayachainStreamingSwapRefund'
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
  it('should be able to parse a standard send tx', async () => {
    const { tx, txNoFee, txWithFee } = standard
    const address = 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc'

    const fee: Fee = {
      assetId: mayachainAssetId,
      value: '12345',
    }

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
          type: TransferType.Send,
          from: address,
          to: 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6',
          assetId: mayachainAssetId,
          totalValue: '1551500000000',
          components: [{ value: '1551500000000' }],
        },
      ],
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a standard receive tx', async () => {
    const { tx } = standard
    const address = 'thor1279z3ld4a2qnxvt49m36gxu9ghspxxppz40kf6'

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
          from: 'thor1n9cuafe8trfhw2e8gt7794zv9hfwk6gfmzllzc',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '1551500000000',
          components: [{ value: '1551500000000' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse swap', async () => {
    const { tx } = mayachainSwap
    const address = 'thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws'
    const memo = 'SWAP:avax/avax:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:5142676147'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '41666000000',
          components: [{ value: '41666000000' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Standard' } },
      trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse swap outbound', async () => {
    const { tx, actionsResponse } = mayachainSwapOutbound
    const address = 'thor1f6l25d5zech60d036e57t3vkqh3gs7qsrsp08w'
    const memo = 'OUT:0BB1C342AA5C5834F51BB77FFBA8462BB025274357683A68B07C55536AD6E5D5'

    mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

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
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '21147787600',
          components: [{ value: '21147787600' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Standard' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse swap refund', async () => {
    const { tx, actionsResponse } = mayachainSwapRefund
    const address = 'thor155aucsw0n50lpdk6cx55cp2qz5txeedru56zml'
    const memo = 'REFUND:6628AF59FE3F1B783F4A85E51069574CF895FBCCB2F3246CE8392900EFE3A189'

    mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

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
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '39503960585',
          components: [{ value: '39503960585' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Standard' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse streaming swap', async () => {
    const { tx } = mayachainStreamingSwap
    const address = 'thor197ssrutuncwptemfh3kxnwqm0hgpxery479tp0'
    const memo = '=:ETH.ETH:0xC7aF182e65EA4Bda6A455872FE4FDa5Df39C69D1:0/1/0:te:0'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '16000000000',
          components: [{ value: '16000000000' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Streaming' } },
      trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse streaming swap outbound', async () => {
    const { tx, actionsResponse } = mayachainStreamingSwapOutbound
    const address = 'thor1jgrk28l7fq3gat2nmu3qv580mz043r2fmhxq8e'
    const memo = 'OUT:CC07D5BC49E769EAC4373AE3E02D5670D7F08FACE2F50E895CE32F8B6336A341'

    mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

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
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '1058315400',
          components: [{ value: '1058315400' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swapOut', swap: { type: 'Streaming' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse streaming swap refund', async () => {
    const { tx, actionsResponse } = mayachainStreamingSwapRefund
    const address = 'thor14d84esehyv8w3g9mz9kuafzl65gdd6ns647q7q'
    const memo = 'REFUND:96E69FB82E08FE735306493ED5EAF0DB7AC36AE71A180649929FB76ADF6F52DD'

    mocks.get.mockImplementationOnce(() => ({ data: actionsResponse }))

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
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '46426571430',
          components: [{ value: '46426571430' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'swapRefund', swap: { type: 'Streaming' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse lp deposit', async () => {
    const { tx } = mayachainLpDeposit
    const address = 'thor1h69n79u4ykwjc5z7m68yncc83vuky8t4t69rlh'
    const memo = '+:BSC.BNB:0x8e247cba845e3565f0c0707e4de049043e29c34e:wr:100'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '19790527128',
          components: [{ value: '19790527128' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'deposit', liquidity: { type: 'LP' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse lp withdraw', async () => {
    const { tx } = mayachainLpWithdraw
    const address = 'thor1ekfgmlss3sjedv207ehcdrh89h4e7tlsf45v58'
    const memo = '-:BNB.BTCB-1de:10000'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '0',
          components: [{ value: '0' }],
        },
        {
          type: TransferType.Receive,
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '106772664803',
          components: [{ value: '106772664803' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'withdrawNative', liquidity: { type: 'LP' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse lp refund', async () => {
    const { tx } = mayachainLpRefund
    const address = 'thor1j5jxvwd33rz66r88vwwwayvncjadx9jy5hvvqw'
    const memo = '+:ETH.HOT-0X6C6EE5E31D828DE241282B9606C8E98EA48526E2::ss:0'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '22026432',
          components: [{ value: '22026432' }],
        },
        {
          type: TransferType.Receive,
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '20026432',
          components: [{ value: '20026432' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'depositRefundNative', liquidity: { type: 'LP' } },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })

  it('should be able to parse generic refund', async () => {
    const { tx } = mayachainRefund
    const address = 'thor1x3379v4xjyc5nlhs83j5zhfs5m948nk72u5uax'
    const memo = 'REFUND:565C1D3741A94929E2AE4267C23A42F9F6844D7F894BAC56A54533B33DE7BB0F'

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
        value: '2000000',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          assetId: mayachainAssetId,
          totalValue: '20000000',
          components: [{ value: '20000000' }],
        },
        {
          type: TransferType.Receive,
          from: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0',
          to: address,
          assetId: mayachainAssetId,
          totalValue: '18000000',
          components: [{ value: '18000000' }],
        },
      ],
      data: { parser: 'thorchain', memo, method: 'refund' },
    }

    const actual = await txParser.parse(tx, address)

    expect(actual).toEqual(expected)
  })
})
