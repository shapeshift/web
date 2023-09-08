import { cosmosAssetId, cosmosChainId } from '@shapeshiftoss/caip'

import { TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import delegate from './mockData/delegate'
import ibc_receive from './mockData/ibc_receive'
import ibc_transfer from './mockData/ibc_transfer'
import redelegate from './mockData/redelegate'
import reward from './mockData/reward'
import standard from './mockData/standard'
import undelegate from './mockData/undelegate'

const txParser = new TransactionParser({ chainId: cosmosChainId, assetId: cosmosAssetId })

describe('parseTx', () => {
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

  it('should be able to parse an ibc transfer tx', async () => {
    const { tx } = ibc_transfer
    const address = 'cosmos1syj2za9lxkhgpd9zm5lzfss9f6qcuyca354whm'

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
        value: '3250',
      },
      transfers: [
        {
          type: TransferType.Send,
          assetId: cosmosAssetId,
          from: address,
          to: 'osmo1syj2za9lxkhgpd9zm5lzfss9f6qcuycae0x7pf',
          totalValue: '600000',
          components: [{ value: '600000' }],
        },
      ],
      data: {
        parser: 'ibc',
        method: 'transfer',
        ibcDestination: 'osmo1syj2za9lxkhgpd9zm5lzfss9f6qcuycae0x7pf',
        ibcSource: address,
        assetId: cosmosAssetId,
        value: '600000',
        sequence: '1258481',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse an ibc receive tx', async () => {
    const { tx } = ibc_receive
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
      transfers: [
        {
          type: TransferType.Receive,
          assetId: cosmosAssetId,
          from: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
          to: address,
          totalValue: '3230396',
          components: [{ value: '3230396' }],
        },
      ],
      data: {
        parser: 'ibc',
        method: 'recv_packet',
        ibcDestination: address,
        ibcSource: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        assetId: cosmosAssetId,
        value: '3230396',
        sequence: '516701',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })
})
