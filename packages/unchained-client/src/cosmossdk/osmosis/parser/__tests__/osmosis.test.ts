import { osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'

import type { Fee } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import delegate from './mockData/delegate'
import exit_pool from './mockData/exit_pool'
import ibc_receive from './mockData/ibc_receive'
import ibc_transfer from './mockData/ibc_transfer'
import join_pool from './mockData/join_pool'
import redelegate from './mockData/redelegate'
import reward from './mockData/reward'
import standard from './mockData/standard'
import swap_exact_amount_in from './mockData/swap_exact_amount_in'
import undelegate from './mockData/undelegate'

const txParser = new TransactionParser({ chainId: osmosisChainId, assetId: osmosisAssetId })

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

  it('should be able to parse a delegate tx', async () => {
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
        parser: 'staking',
        method: 'delegate',
        delegator: address,
        destinationValidator: 'osmovaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxwmj9we',
        assetId: osmosisAssetId,
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
        parser: 'staking',
        method: 'begin_unbonding',
        delegator: address,
        destinationValidator: 'osmovaloper1t8qckan2yrygq7kl9apwhzfalwzgc2429p8f0s',
        assetId: osmosisAssetId,
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
        parser: 'staking',
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
        parser: 'staking',
        method: 'withdraw_delegator_reward',
        delegator: address,
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
        parser: 'ibc',
        method: 'transfer',
        ibcDestination: 'cosmos1wrk4vlk03unephl72ntttcd80lnf7a2ywtzrvu',
        ibcSource: address,
        assetId:
          'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        value: '2898071',
        sequence: '1248748',
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
        parser: 'ibc',
        method: 'recv_packet',
        ibcDestination: address,
        ibcSource: 'evmos1mmxzd4c4kap3x60eu2rvnfrac264sjgxwu930y',
        assetId:
          'cosmos:osmosis-1/ibc:6AE98883D4D5D5FF9E50D7130F1305DA2FFA0C652D1DD9C123657C6B4EB2DF8A',
        value: '4190000000000000000',
        sequence: '554234',
      },
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a swap exact amount in tx', async () => {
    const { tx, txNoFee, txWithFee } = swap_exact_amount_in
    const address = 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt'

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
          to: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
          totalValue: '30000',
          components: [{ value: '30000' }],
        },
        {
          type: TransferType.Receive,
          assetId: osmosisAssetId,
          from: 'osmo1mw0ac6rwlp5r8wapwk3zs6g29h8fcscxqakdzw9emkne6c8wjp9q0t3v8t',
          to: address,
          totalValue: '268124',
          components: [{ value: '268124' }],
        },
      ],
      data: {
        parser: 'swap',
        method: 'swap_exact_amount_in',
      },
      trade: {
        dexName: Dex.Osmosis,
        type: TradeType.Trade,
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a lp deposit tx', async () => {
    const { tx, txNoFee, txWithFee } = join_pool
    const address = 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu'

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
          from: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
          to: '',
          totalValue: '4996551',
          components: [
            {
              value: '4996551',
            },
          ],
        },
        {
          type: TransferType.Send,
          assetId: 'cosmos:osmosis-1/slip44:118',
          from: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
          to: '',
          totalValue: '69000357',
          components: [
            {
              value: '69000357',
            },
          ],
        },
        {
          type: TransferType.Receive,
          assetId: 'cosmos:osmosis-1/ibc:gamm/pool/1',
          from: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
          to: 'osmo1sa6w2c3glhnrfmgjklh9j7r54en2ng9yj6zewu',
          totalValue: '492310218978494996725',
          components: [
            {
              value: '492310218978494996725',
            },
          ],
        },
      ],
      data: {
        parser: 'lp',
        method: 'join_pool',
        pool: '1',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })

  it('should be able to parse a lp withdraw tx', async () => {
    const { tx, txNoFee, txWithFee } = exit_pool
    const address = 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7'

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
          assetId:
            'cosmos:osmosis-1/ibc:27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
          from: '',
          to: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
          totalValue: '24670050',
          components: [
            {
              value: '24670050',
            },
          ],
        },
        {
          type: TransferType.Receive,
          assetId: 'cosmos:osmosis-1/slip44:118',
          from: '',
          to: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
          totalValue: '335768900',
          components: [
            {
              value: '335768900',
            },
          ],
        },
        {
          type: TransferType.Send,
          assetId: 'cosmos:osmosis-1/ibc:gamm/pool/1',
          from: 'osmo1mw5cp5jurwkd53a0hefq6epj88700kdzwqmcl7',
          to: 'osmo1c9y7crgg6y9pfkq0y8mqzknqz84c3etr0kpcvj',
          totalValue: '2412819982721898705868',
          components: [
            {
              value: '2412819982721898705868',
            },
          ],
        },
      ],
      data: {
        parser: 'lp',
        method: 'exit_pool',
        pool: '1',
      },
    }

    const expectedWithFee = { ...expected, fee }
    const actualWithFee = await txParser.parse(txWithFee, address)

    expect(expectedWithFee).toEqual(actualWithFee)

    const expectedNoFee = expected
    const actualNoFee = await txParser.parse(txNoFee, address)

    expect(expectedNoFee).toEqual(actualNoFee)
  })
})
