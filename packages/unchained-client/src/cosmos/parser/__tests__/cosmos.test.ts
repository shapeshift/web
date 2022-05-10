import { Status, TransferType } from '../../../types'
import { ParsedTx } from '../../types'
import { TransactionParser } from '../index'
import delegate from './mockData/delegate'
import ibc_receive from './mockData/ibc_receive'
import ibc_send from './mockData/ibc_send'
import redelegate from './mockData/redelegate'
import reward from './mockData/reward'
import standard from './mockData/standard'
import undelegate from './mockData/undelegate'

const txParser = new TransactionParser({ chainId: 'cosmos:cosmoshub-4' })

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
      status: Status.Confirmed,
      address,
      chainId: 'cosmos:cosmoshub-4',
      fee: {
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '2500'
      },
      transfers: [
        {
          type: TransferType.Send,
          from: address,
          to: 'cosmos14e25lpsedq863vgweqg4m9n0z28c203kfdlzmz',
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          totalValue: '2002965',
          components: [{ value: '2002965' }]
        }
      ]
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
      status: Status.Confirmed,
      address,
      chainId: 'cosmos:cosmoshub-4',
      transfers: [
        {
          type: TransferType.Receive,
          from: 'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
          to: address,
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          totalValue: '2002965',
          components: [{ value: '2002965' }]
        }
      ]
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a delegate tx', async () => {
    const { tx } = delegate
    const address = 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05'
    const expected: ParsedTx = {
      address: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      blockHash: 'D8186504233B8AD92ED2799D88A16A38F706889A99F1AEC49A6EA96EC94AE4E7',
      blockHeight: 9636923,
      blockTime: 1645207449,
      chainId: 'cosmos:cosmoshub-4',
      confirmations: 358801,
      status: Status.Confirmed,
      transfers: [
        {
          type: TransferType.Send,
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          from: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
          to: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
          totalValue: '1920000',
          components: [{ value: '1920000' }]
        }
      ],
      txid: '8136FF781B38919958249308CFABFD253CF371514661119BCD231875968BD06B',
      data: {
        parser: 'cosmos',
        method: 'delegate',
        delegator: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        destinationValidator: 'cosmosvaloper1lzhlnpahvznwfv4jmay2tgaha5kmz5qxerarrl',
        value: `1920000`
      },
      fee: {
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '6250'
      }
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a undelegate tx', async () => {
    const { tx } = undelegate
    const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'
    const expected: ParsedTx = {
      address,
      blockHash: '140D9DEC3087EA26248B60559D9C044F649749E4483E8E1F30143A8E47E7FFE8',
      blockHeight: 9636932,
      blockTime: 1646429915,
      chainId: 'cosmos:cosmoshub-4',
      confirmations: 229191,
      status: Status.Confirmed,
      fee: {
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '6250'
      },
      transfers: [
        {
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          components: [
            {
              value: '200000'
            }
          ],
          from: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
          to: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
          token: undefined,
          totalValue: '200000',
          type: TransferType.Receive
        }
      ],
      txid: '1795FE6ED7B5A8C5478CBDE27F35C8FB64FC6229B7B90FA47D4406AA2078BBAB',
      data: {
        parser: 'cosmos',
        method: 'begin_unbonding',
        delegator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
        destinationValidator: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        value: `200000`
      }
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a redelegate tx', async () => {
    const { tx } = redelegate
    const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'
    const expected: ParsedTx = {
      address,
      blockHash: 'C3B387CF51B0957D52A79CF5EB4E50665661AC9528C6A65501EB45DA3D3A4A49',
      blockHeight: 9636911,
      blockTime: 1646429755,
      chainId: 'cosmos:cosmoshub-4',
      confirmations: 229341,
      status: Status.Confirmed,
      transfers: [],
      txid: 'A69531AE72161D6556CEE744D5D6B3D0661443FA66C89360F40EC75CF7E278CA',
      data: {
        parser: 'cosmos',
        method: 'begin_redelegate',
        sourceValidator: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
        delegator: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        destinationValidator: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf',
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: `500000`
      },
      fee: {
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '6250'
      }
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse a reward tx', async () => {
    const { tx } = reward
    const address = 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05'
    const expected: ParsedTx = {
      address: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
      blockHash: 'DFFDB4B083138492721673E6754FAE5533C8D2D0AFC1928E959CDBB464E20864',
      blockHeight: 9636957,
      blockTime: 1646430088,
      chainId: 'cosmos:cosmoshub-4',
      confirmations: 229401,
      status: Status.Confirmed,
      transfers: [
        {
          type: TransferType.Receive,
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          from: 'cosmosvaloper1hdrlqvyjfy5sdrseecjrutyws9khtxxaux62l7',
          to: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
          totalValue: '39447',
          components: [{ value: '39447' }]
        }
      ],
      txid: 'E34AFB3A28198957040073034E16D4A979B403E672859651B41C207538136ABE',
      data: {
        parser: 'cosmos',
        method: 'withdraw_delegator_reward',
        destinationValidator: 'cosmos179k2lz70rxvjrvvr65cynw9x5c8v3kftg46v05',
        value: '39447',
        assetId: 'cosmos:cosmoshub-4/slip44:118'
      },
      fee: {
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '7000'
      }
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })

  it('should be able to parse an ibc send tx', async () => {
    const { tx } = ibc_send
    const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'

    const expected: ParsedTx = {
      address: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      blockHash: 'C09E8EA1D6CD85AE8CFC2CF90B5D02EF79742167F0A161580077D44149616C65',
      blockHeight: 8418140,
      blockTime: 1637387732,
      chainId: 'cosmos:cosmoshub-4',
      confirmations: 1632185,
      status: Status.Confirmed,
      transfers: [
        {
          type: TransferType.Send,
          assetId: 'cosmos:cosmoshub-4/slip44:118',
          from: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
          to: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
          totalValue: '108444',
          components: [
            {
              value: '108444'
            }
          ]
        }
      ],
      txid: '51D1916A963DDDC01A507D3323A27D59C88C9EFC0F1666E0FA4F326C451CE4C4',
      data: {
        parser: 'cosmos',
        method: 'ibc_send',
        ibcDestination: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        ibcSource: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        value: '108444'
      }
    }

    const actual = await txParser.parse(tx, address)

    expect(expected).toEqual(actual)
  })
})

it('should be able to parse an ibc receive tx', async () => {
  const { tx } = ibc_receive
  const address = 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e'

  const expected: ParsedTx = {
    address: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
    blockHash: '16C1E10CBF15AA0E2C147AA8473B691B0F1AE1800DC990A088E7643668A05BA2',
    blockHeight: 9636880,
    blockTime: 1646429517,
    chainId: 'cosmos:cosmoshub-4',
    confirmations: 231594,
    status: Status.Confirmed,
    transfers: [
      {
        type: TransferType.Receive,
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        from: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
        to: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
        totalValue: '3230396',
        components: [
          {
            value: '3230396'
          }
        ]
      }
    ],
    txid: 'D78AB26809244FD2E9D65120285624CB61BCB5B9FBC2164DAC379C2CC7A78DE8',
    data: {
      parser: 'cosmos',
      method: 'ibc_receive',
      ibcDestination: 'cosmos1fx4jwv3aalxqwmrpymn34l582lnehr3eqwuz9e',
      ibcSource: 'osmo1fx4jwv3aalxqwmrpymn34l582lnehr3eg40jnt',
      assetId: 'cosmos:cosmoshub-4/slip44:118',
      value: '3230396'
    }
  }

  const actual = await txParser.parse(tx, address)

  expect(expected).toEqual(actual)
})
