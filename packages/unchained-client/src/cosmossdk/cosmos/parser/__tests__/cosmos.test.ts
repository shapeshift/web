import { cosmosAssetId, cosmosChainId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import delegate from './mockData/delegate'
import redelegate from './mockData/redelegate'
import reward from './mockData/reward'
import standard from './mockData/standard'
import thorchainLoanOpenOutbound from './mockData/thorchainLoanOpenOutbound'
import thorchainLoanRepayment from './mockData/thorchainLoanRepayment'
import thorchainLoanRepaymentRefund from './mockData/thorchainLoanRepaymentRefund'
import thorchainLpDeposit from './mockData/thorchainLpDeposit'
import thorchainLpOutbound from './mockData/thorchainLpOutbound'
import thorchainLpRefund from './mockData/thorchainLpRefund'
import thorchainLpWithdraw from './mockData/thorchainLpWithdraw'
import thorchainSaversDeposit from './mockData/thorchainSaversDeposit'
import thorchainSaversOutbound from './mockData/thorchainSaversOutbound'
import thorchainSaversRefund from './mockData/thorchainSaversRefund'
import thorchainSaversWithdraw from './mockData/thorchainSaversWithdraw'
import thorchainStreamingSwap from './mockData/thorchainStreamingSwap'
import thorchainStreamingSwapOutbound from './mockData/thorchainStreamingSwapOutbound'
import thorchainStreamingSwapRefund from './mockData/thorchainStreamingSwapRefund'
import thorchainSwap from './mockData/thorchainSwap'
import thorchainSwapOutbound from './mockData/thorchainSwapOutbound'
import thorchainSwapRefund from './mockData/thorchainSwapRefund'
import undelegate from './mockData/undelegate'

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
  chainId: cosmosChainId,
  assetId: cosmosAssetId,
  midgardUrl: '',
})

describe('parseTx', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('should be able to parse a standard send tx', async () => {
    const { tx } = standard
    const address = 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      fee: {
        assetId: cosmosAssetId,
        value: '2500',
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz',
          assetId: cosmosAssetId,
          totalValue: '2002965',
          components: [{ value: '2002965' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a standard receive tx', async () => {
    const { tx } = standard
    const address = 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
          to: address,
          assetId: cosmosAssetId,
          totalValue: '2002965',
          components: [{ value: '2002965' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a delegate tx', async () => {
    const { tx } = delegate
    const address = 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      fee: {
        assetId: cosmosAssetId,
        value: '6250',
      },
      transfers: [
        {
          type: TransferType.Send,
          assetId: cosmosAssetId,
          from: address,
          to: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
          totalValue: '1920000',
          components: [{ value: '1920000' }],
        },
      ],
      data: {
        parser: 'staking',
        method: 'delegate',
        delegator: address,
        destinationValidator: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
        assetId: cosmosAssetId,
        value: '1920000',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a undelegate tx', async () => {
    const { tx } = undelegate
    const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      fee: {
        assetId: cosmosAssetId,
        value: '6250',
      },
      transfers: [
        {
          assetId: cosmosAssetId,
          components: [{ value: '200000' }],
          from: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
          to: address,
          totalValue: '200000',
          type: TransferType.Receive,
        },
      ],
      data: {
        parser: 'staking',
        method: 'begin_unbonding',
        delegator: address,
        destinationValidator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
        assetId: cosmosAssetId,
        value: '200000',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a redelegate tx', async () => {
    const { tx } = redelegate
    const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      fee: {
        assetId: cosmosAssetId,
        value: '6250',
      },
      transfers: [],
      data: {
        parser: 'staking',
        method: 'begin_redelegate',
        sourceValidator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
        delegator: address,
        destinationValidator: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
        assetId: cosmosAssetId,
        value: '500000',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a reward tx', async () => {
    const { tx } = reward
    const address = 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: cosmosChainId,
      fee: {
        assetId: cosmosAssetId,
        value: '7000',
      },
      transfers: [
        {
          type: TransferType.Receive,
          assetId: cosmosAssetId,
          from: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
          to: address,
          totalValue: '39447',
          components: [{ value: '39447' }],
        },
        {
          type: TransferType.Receive,
          assetId: cosmosAssetId,
          from: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
          to: address,
          totalValue: '7',
          components: [{ value: '7' }],
        },
      ],
      data: {
        parser: 'staking',
        method: 'withdraw_delegator_reward',
        delegator: address,
        destinationValidator: address,
        value: '39447',
        assetId: cosmosAssetId,
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  describe('thorchain', () => {
    it('should be able to parse swap', async () => {
      const { tx } = thorchainSwap
      const address = 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7'
      const memo = 'SWAP:THOR.RUNE:thor166n4w5039meulfa3p6ydg60ve6ueac7tlt0jws:30984116284'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '2000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
            assetId: cosmosAssetId,
            totalValue: '140122500',
            components: [{ value: '140122500' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Standard' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse swap outbound', async () => {
      const { tx, actionsResponse } = thorchainSwapOutbound
      const address = 'cosmos10hng6437uh2yvjy6ax7dsmhkm0446z224s3ag6'
      const memo = 'OUT:818B5E84218B3A159EFD4F8DDA6484E005A9CE6558E9C12DD188E323B3E6F180'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '42366561',
            components: [{ value: '42366561' }],
          },
        ],
        data: {
          parser: 'thorchain',
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
      const { tx, actionsResponse } = thorchainSwapRefund
      const address = 'cosmos1dnssyzyhnja28zdww2ffa6fcxaxwanguf7nmq7'
      const memo = 'REFUND:361F10B0AEAB2DD40B431EA4941D0EA5A18BE6AE10E29C0F845375955B4860F4'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '175005078',
            components: [{ value: '175005078' }],
          },
        ],
        data: {
          parser: 'thorchain',
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
      const { tx } = thorchainStreamingSwap
      const address = 'cosmos1nz22stv03fcp29563jrgu2v56hd92l96wwystz'
      const memo = '=:BNB.BNB:bnb1e75f8rzqlsrm3qepv4qh2ytp07ad6625at8nzg:0/1/0:te:0'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '466',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1mkjaqql9a2la7z8xt2xg0w0m60002m579x2ycf',
            assetId: cosmosAssetId,
            totalValue: '402000000',
            components: [{ value: '402000000' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'swap', swap: { type: 'Streaming' } },
        trade: { dexName: Dex.Thor, memo, type: TradeType.Swap },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse streaming swap outbound', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapOutbound
      const address = 'cosmos1laznh8p3tvwu7q8ytrnn6nrntfyx0mpvvrltzl'
      const memo = 'OUT:59DDC87BE3B99846002140031F28AB0E1A1E4F01D0DA3A2D252953D9D47C9912'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '237608436',
            components: [{ value: '237608436' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'swapOut',
          swap: { type: 'Streaming' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse streaming swap refund', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapRefund
      const address = 'cosmos1s9t9jkqvwcwh66c4nya5vxnsntew3wrcald960'
      const memo = 'REFUND:CFD82073CB432FDFFA4BB75FE0838A1C28FD966F91E91AD9A421F128AFDC97C2'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1kfj43sgxqcglc2ydk0v34re523ent6qhmaj4l5',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '125995651',
            components: [{ value: '125995651' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'swapRefund',
          swap: { type: 'Streaming' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers deposit', async () => {
      const { tx } = thorchainSaversDeposit
      const address = 'cosmos12ddmphvtnv2raa3pla7afypt85kffnjlg5mt85'
      const memo = '+:GAIA/ATOM::ss:0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '10000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
            assetId: cosmosAssetId,
            totalValue: '4681875',
            components: [{ value: '4681875' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'deposit', liquidity: { type: 'Savers' } },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers withdraw', async () => {
      const { tx } = thorchainSaversWithdraw
      const address = 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn'
      const memo = '-:GAIA/ATOM:10000'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '3000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos17hvcftcmc772t8e46cm4s2gv2r0m9pnszjcqpy',
            assetId: cosmosAssetId,
            totalValue: '100',
            components: [{ value: '100' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdraw', liquidity: { type: 'Savers' } },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers outbound', async () => {
      const { tx, actionsResponse } = thorchainSaversOutbound
      const address = 'cosmos1g7ufueqz24luzcj0d5h8u3452vv4l4d9fz0fdn'
      const memo = 'OUT:860B73A29EA69D7FB24B4B17893CF7CDB3B66C2BB9DD91872B140A2F325294D8'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1eejue3dchfzd7e6pr089mkrqx7fmhghlux920v',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '9066156',
            components: [{ value: '9066156' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[1].metadata?.withdraw?.memo,
          method: 'withdrawOut',
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers refund', async () => {
      const { tx, actionsResponse } = thorchainSaversRefund
      const address = 'cosmos1yt49rwszuelyh0k9hl6kkq4kdn66aeqwxez6sc'
      const memo = 'REFUND:44BC762D4D5A1BD3ED8D06EFADDD905CC05CB48FB233D88119EBC0FE7DF7A8F1'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos19ksklulcdweea750pr3dw70v0gulj6s5xwdlpp',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '885148',
            components: [{ value: '885148' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'depositRefund',
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp deposit', async () => {
      const { tx } = thorchainLpDeposit
      const address = 'cosmos1a8l3srqyk5krvzhkt7cyzy52yxcght6322w2qy'
      const memo = '+:GAIA.ATOM::ss:29'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '10000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1ujd8p9lu265k982fq32j7ww2dndgeccvu6etfs',
            assetId: cosmosAssetId,
            totalValue: '100000',
            components: [{ value: '100000' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'deposit', liquidity: { type: 'LP' } },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp withdraw', async () => {
      const { tx } = thorchainLpWithdraw
      const address = 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w'
      const memo = '-:GAIA.ATOM:10000'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '2491',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1g7a7l9zp4h0vma5tqe5xnmvps3wyzumwel2j95',
            assetId: cosmosAssetId,
            totalValue: '1',
            components: [{ value: '1' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'withdraw', liquidity: { type: 'LP' } },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp outbound', async () => {
      const { tx, actionsResponse } = thorchainLpOutbound
      const address = 'cosmos18377m4dkzz9exa6yctph0fu9ygsexgjvfy893w'
      const memo = 'OUT:E8C9E5708C60F1C17AB106851EB19B0BF8A888A5FA0E079B7DFC7DBDB8B2E21D'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos12sdwha358f7rdpn6t77aqjmmzcz03x0gs9hmls',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '48123192',
            components: [{ value: '48123192' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.withdraw?.memo,
          method: 'withdrawOut',
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp refund', async () => {
      const { tx, actionsResponse } = thorchainLpRefund
      const address = 'cosmos1x04c87s4kyfr3ktrvkd47h43jlz35gys0rjfn0'
      const memo = 'REFUND:70D66FC759772014C0273EB84691A2A4BFFCD0EFA6ED3A4E5A9A021C1FF53338'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1h7cjvuc3gtt3r4afm0zqvhvrpkfw0ahx4nszv3',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '5678021',
            components: [{ value: '5678021' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'depositRefund',
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan open outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenOutbound
      const address = 'cosmos173xmmmzpalc9h7ynwtn6fl76h78n57e8kp7cp6'
      const memo = 'OUT:C8ECD3A1C72473C294A63428E6284B2CEEC972BFA7372DF475F381777168D486'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1vkakp7qxx2sjxnp3hyw592h2yxd530yvkng95e',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '70370080',
            components: [{ value: '70370080' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'loanOpenOut',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan repayment', async () => {
      const { tx } = thorchainLoanRepayment
      const address = 'cosmos1csjuyfe8tnyn5q5sgm3wxetfqkt9053at78n69'
      const memo = '$-:BTC.BTC:bc1q7s6r03k7e7x2gthzmjk2fptx32ags78jk57cu4'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        fee: {
          assetId: cosmosAssetId,
          value: '2281',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'cosmos1lwktkpjh3tvmlftfkaz9xukw7xzksh059eslkf',
            assetId: cosmosAssetId,
            totalValue: '45633513',
            components: [{ value: '45633513' }],
          },
        ],
        data: { parser: 'thorchain', memo, method: 'loanRepayment' },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan repayment refund', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentRefund
      const address = 'cosmos1vvtcw3cvje0kthxca6w5q2nz5kxr9cnckrutgc'
      const memo = 'REFUND:4EAC7774DD66B1AC08C9FE36ABC324875CF64B31E591649E5E410898F1603AD1'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: cosmosChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'cosmos1fpsa38rmg2v829umggnvj09acurtzycjnhgnt4',
            to: address,
            assetId: cosmosAssetId,
            totalValue: '201974667',
            components: [{ value: '201974667' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          method: 'loanRepaymentRefund',
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})
