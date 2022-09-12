import { osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'

import { Fee, TransferType, TxStatus } from '../../../../types'
import { ParsedTx } from '../../../parser/types'
import { TransactionParser } from '../index'
import delegate from './mockData/delegate'
import ibc_receive from './mockData/ibc_receive'
import ibc_transfer from './mockData/ibc_transfer'
import redelegate from './mockData/redelegate'
import reward from './mockData/reward'
import standard from './mockData/standard'
import swap_exact_amount_in from './mockData/swap_exact_amount_in'
import undelegate from './mockData/undelegate'

const txParser = new TransactionParser({ chainId: osmosisChainId })

describe('parseTx', () => {
  it('should be able to parse a standard send tx', async () => {
    const { tx, txNoFee, txWithFee } = standard
    const address = 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'osmo1wce63e3czp0jq3qrxgrzkq28e3eqq4uquc85nw',
          assetId: osmosisAssetId,
          totalValue: '5876652',
          components: [{ value: '5876652' }],
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
    const address = 'osmo1wce63e3czp0jq3qrxgrzkq28e3eqq4uquc85nw'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Receive,
          from: 'osmo1px2s26qyv9lz0ds5lswhu5wjx4e4k50rzf3n8s',
          to: address,
          assetId: osmosisAssetId,
          totalValue: '5876652',
          components: [{ value: '5876652' }],
        },
      ],
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a delegate tx with fee', async () => {
    const { tx, txNoFee, txWithFee } = delegate
    const address = 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Send,
          assetId: osmosisAssetId,
          from: address,
          to: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
          totalValue: '22824',
          components: [{ value: '22824' }],
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'delegate',
        delegator: address,
        destinationValidator: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
        value: '22824',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a delegate tx with zero fee', async () => {
    const { tx } = delegate
    const address = 'osmo1t5nts8y096tezaspwzanpsw6dgdh32u8ehu72v'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Send,
          assetId: osmosisAssetId,
          from: address,
          to: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
          totalValue: '22824',
          components: [{ value: '22824' }],
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'delegate',
        delegator: address,
        destinationValidator: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
        value: '22824',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a undelegate tx', async () => {
    const { tx, txNoFee, txWithFee } = undelegate
    const address = 'osmo1cx8fvv8vhp5h354yhrs0emtrj92svucp803lwv'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          assetId: osmosisAssetId,
          components: [{ value: '526000000' }],
          from: 'osmovaloper1t8qckan2yrygq7kl9apwhzfalwzgc2429p8f0s',
          to: address,
          totalValue: '526000000',
          type: TransferType.Receive,
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'begin_unbonding',
        delegator: 'osmovaloper1t8qckan2yrygq7kl9apwhzfalwzgc2429p8f0s',
        destinationValidator: address,
        value: '526000000',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a redelegate tx', async () => {
    const { tx, txNoFee, txWithFee } = redelegate
    const address = 'osmo12lpmwhx9dvsz3tuftt2pfhv76743l0xacx2w00'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [],
      data: {
        parser: 'cosmos',
        method: 'begin_redelegate',
        sourceValidator: 'osmovaloper1ej2es5fjztqjcd4pwa0zyvaevtjd2y5w37wr9t',
        delegator: address,
        destinationValidator: 'osmovaloper16s96n9k9zztdgjy8q4qcxp4hn7ww98qk5wjn0s',
        assetId: osmosisAssetId,
        value: '30000000',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a reward tx', async () => {
    const { tx, txNoFee, txWithFee } = reward
    const address = 'osmo1jgsskpq4hng3ykjp64ywxqcp4kwke5a8x9jjym'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Receive,
          assetId: osmosisAssetId,
          from: 'osmovaloper12zwq8pcmmgwsl95rueqsf65avfg5zcj047ucw6',
          to: address,
          totalValue: '273799',
          components: [{ value: '273799' }],
        },
        {
          type: TransferType.Receive,
          assetId: osmosisAssetId,
          from: 'osmovaloper12rzd5qr2wmpseypvkjl0spusts0eruw2g35lkn',
          to: address,
          totalValue: '273799',
          components: [{ value: '273799' }],
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'withdraw_delegator_reward',
        destinationValidator: address,
        value: '273799',
        assetId: osmosisAssetId,
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse an ibc transfer tx', async () => {
    const { tx, txNoFee, txWithFee } = ibc_transfer
    const address = 'osmo1wrk4vlk03unephl72ntttcd80lnf7a2yxs3n6w'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Send,
          assetId:
            'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
          from: address,
          to: 'cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu',
          totalValue: '2898071',
          components: [{ value: '2898071' }],
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'ibc_transfer',
        ibcDestination: 'cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu',
        ibcSource: address,
        assetId: osmosisAssetId,
        value: '2898071',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse an ibc receive tx', async () => {
    const { tx } = ibc_receive
    const address = 'osmo1242l37paupq0fxcqd8cvnth5x6s6gcczwmvwfc'

    const expected: ParsedTx = {
      txid: tx.txid,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      confirmations: tx.confirmations,
      status: TxStatus.Confirmed,
      address,
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Receive,
          assetId:
            'cosmos:osmosis-1/ibc:6AE98883D4D5D5FF9E50D7130F1305DA2FFA0C652D1DD9C123657C6B4EB2DF8A',
          from: 'evmos1mmxzd4c4kap3x60eu2rvnfrac264sjgxwu930y',
          to: address,
          totalValue: '4190000000000000000',
          components: [{ value: '4190000000000000000' }],
        },
      ],
      data: {
        parser: 'cosmos',
        method: 'ibc_transfer',
        ibcDestination: address,
        ibcSource: 'evmos1mmxzd4c4kap3x60eu2rvnfrac264sjgxwu930y',
        assetId: osmosisAssetId,
        value: '4190000000000000000',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a swap exact amount in tx', async () => {
    const { tx, txNoFee, txWithFee } = swap_exact_amount_in
    const address = 'osmo1qxtuxfu0axkrvwpncj26asv4py3x6mmw8hln6h'

    const fee: Fee = {
      assetId: osmosisAssetId,
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
      chainId: osmosisChainId,
      transfers: [
        {
          type: TransferType.Send,
          assetId: osmosisAssetId,
          from: address,
          to: '',
          totalValue: '790572',
          components: [{ value: '790572' }],
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
})
