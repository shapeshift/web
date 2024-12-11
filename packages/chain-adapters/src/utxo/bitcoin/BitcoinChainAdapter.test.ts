import { btcAssetId, btcChainId } from '@shapeshiftoss/caip'
import type { BTCWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { NativeAdapterArgs } from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { Bip44Params, UtxoChainId } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Account, BuildSendTxInput, GetFeeDataInput, TxHistoryResponse } from '../../types'
import type { ChainAdapterArgs } from '../UtxoBaseAdapter'
import * as bitcoin from './BitcoinChainAdapter'
import manyInputsManyOutputReceive from './mockData/manyInputsManyOutputReceive'
import manyInputsManyOutputSendNoChange from './mockData/manyInputsManyOutputSendNoChange'
import manyInputsManyOutputSendWithChange from './mockData/manyInputsManyOutputSendWithChange'
import manyInputsSingleOutputReceive from './mockData/manyInputsSingleOutputReceive'
import manyInputsSingleOutputSelfSendNoChange from './mockData/manyInputsSingleOutputSelfSendNoChange'
import manyInputsSingleOutputSelfSendWithChange from './mockData/manyInputsSingleOutputSelfSendWithChange'
import manyInputsSingleOutputSendNoChange from './mockData/manyInputsSingleOutputSendNoChange'
import manyInputsSingleOutputSendWithChange from './mockData/manyInputsSingleOutputSendWithChange'
import singleInputsMultipleOutputReceive from './mockData/singleInputMultipleOutputReceive'
import singleInputsMultipleOutputSendNoChange from './mockData/singleInputMultipleOutputSendNoChange'
import singleInputsMultipleOutputSendWithChange from './mockData/singleInputMultipleOutputSendWithChange'
import singleInputsSingleOutputReceive from './mockData/singleInputSingleOutputReceive'
import singleInputSingleOutputSelfSendNoChange from './mockData/singleInputSingleOutputSelfSendNoChange'
import singleInputSingleOutputSelfSendWithChange from './mockData/singleInputSingleOutputSelfSendWithChange'
import singleInputsSingleOutputSendNoChange from './mockData/singleInputSingleOutputSendNoChange'
import singleInputsSingleOutputSendWithChange from './mockData/singleInputSingleOutputSendWithChange'

vi.mock('../../utils/validateAddress', () => ({
  assertAddressNotSanctioned: vi.fn(),
}))

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'
const VALID_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93'
const VALID_ASSET_ID = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

const getWallet = async (): Promise<HDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test',
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const getUtxosMockResponse = [
  {
    txid: 'ef935d850e7d596f98c6e24d5f25faa770f6e6d8e5eab94dea3e2154c3643986',
    vout: 0,
    value: '1598',
    height: 705718,
    confirmations: 2,
    address: 'bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy',
    path: "m/84'/0'/0'/0/1",
  },
  {
    txid: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
    vout: 0,
    value: '31961',
    height: 705718,
    confirmations: 2,
    address: 'bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy',
    path: "m/84'/0'/0'/0/1",
  },
]

const getAccountMockResponse = {
  balance: '33559',
  chain: 'bitcoin',
  nextChangeAddressIndex: 0,
  nextReceiveAddressIndex: 2,
  network: 'MAINNET',
  pubkey:
    'zpub6qSSRL9wLd6LNee7qjDEuULWccP5Vbm5nuX4geBu8zMCQBWsF5Jo5UswLVxFzcbCMr2yQPG27ZhDs1cUGKVH1RmqkG1PFHkEXyHG7EV3ogY',
  symbol: 'BTC',
}

const getTransactionMockResponse = {
  txid: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
  hash: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
  version: 1,
  size: 223,
  vsize: 223,
  weight: 892,
  locktime: 0,
  vin: [
    {
      txid: 'feab0ffe497740fcc8bcab9c5b12872c4302e629ee8ccc35ed4f6057fc7a4580',
      vout: 1,
      scriptSig: {
        asm: '3045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad[ALL] 027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126',
        hex: '483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126',
      },
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      value: 0.00031961,
      n: 0,
      scriptPubKey: {
        asm: '0 0c0585f37ff3f9f127c9788941d6082cf7aa0121',
        hex: '00140c0585f37ff3f9f127c9788941d6082cf7aa0121',
        reqSigs: 1,
        type: 'witness_v0_keyhash',
        addresses: ['bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy'],
      },
    },
    {
      value: 0.00057203,
      n: 1,
      scriptPubKey: {
        asm: 'OP_DUP OP_HASH160 b22138dfe140e4611b98bdb728eed04beed754c4 OP_EQUALVERIFY OP_CHECKSIG',
        hex: '76a914b22138dfe140e4611b98bdb728eed04beed754c488ac',
        reqSigs: 1,
        type: 'pubkeyhash',
        addresses: ['1HEs5TpTvrWHDFqLqfZnXFLFc4hqHjHe5M'],
      },
    },
  ],
  hex: '010000000180457afc57604fed35cc8cee29e602432c87125b9cabbcc8fc407749fe0fabfe010000006b483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126ffffffff02d97c0000000000001600140c0585f37ff3f9f127c9788941d6082cf7aa012173df0000000000001976a914b22138dfe140e4611b98bdb728eed04beed754c488ac00000000',
  blockhash: '000000000000000000033c8ec44721d844aa63f4312d65261eb4c4d0cd4e0379',
  confirmations: 2,
  time: 1634662208,
  blocktime: 1634662208,
}

const getNetworkFeesMockedResponse = {
  fast: {
    blocksUntilConfirmation: 1,
    satsPerKiloByte: 1024,
  },
  average: {
    blocksUntilConfirmation: 1,
    satsPerKiloByte: 1024,
  },
  slow: {
    blocksUntilConfirmation: 1,
    satsPerKiloByte: 1024,
  },
}

describe('BitcoinChainAdapter', () => {
  let args: ChainAdapterArgs = {} as any

  beforeEach(() => {
    args = {
      providers: {
        http: {} as any,
        ws: {} as any,
      },
      coinName: 'Bitcoin',
      chainId: KnownChainIds.BitcoinMainnet,
      midgardUrl: '',
    }
  })

  describe('constructor', () => {
    it('should return chainAdapter with Bitcoin chainId', () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const chainId = adapter.getChainId()
      expect(chainId).toEqual(VALID_CHAIN_ID)
    })
    it('should return chainAdapter with Bitcoin assetId', () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const assetId = adapter.getFeeAssetId()
      expect(assetId).toEqual(VALID_ASSET_ID)
    })
    it('should use default chainId if no arg chainId provided.', () => {
      delete args.chainId
      const adapter = new bitcoin.ChainAdapter(args)
      const chainId = adapter.getChainId()
      expect(chainId).toEqual('bip122:000000000019d6689c085ae165831e93')
    })
  })

  describe('getType', () => {
    it('should return KnownChainIds.BitcoinMainnet', () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const type = adapter.getType()
      expect(type).toEqual(KnownChainIds.BitcoinMainnet)
    })
  })

  describe('getAccount', () => {
    it('should return account info for a specified address', async () => {
      args.providers.http = {
        getAccount: vi.fn().mockResolvedValue({
          pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
          balance: '100',
          unconfirmedBalance: '50',
          addresses: [],
          nextChangeAddressIndex: 0,
          nextReceiveAddressIndex: 0,
        }),
      } as any

      const adapter = new bitcoin.ChainAdapter(args)
      const expected: Account<KnownChainIds.BitcoinMainnet> = {
        pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
        chain: KnownChainIds.BitcoinMainnet,
        balance: '150',
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        chainSpecific: {
          addresses: [],
          nextChangeAddressIndex: 0,
          nextReceiveAddressIndex: 0,
        },
      }
      const data = await adapter.getAccount('SomeFakeAddress')
      expect(data).toMatchObject(expected)
      expect(args.providers.http.getAccount).toHaveBeenCalled()
    })
  })

  describe('getTxHistory', () => {
    describe('single input', () => {
      describe('send', () => {
        it('should handle one output (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsSingleOutputSendNoChange.account),
            getTxHistory: vi.fn().mockResolvedValue(singleInputsSingleOutputSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsSingleOutputSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '24736',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1q2eh0lqu8rerhqzrg8rq04wgxahvx6ly3vxuuqm'],
                    to: ['bc1pq6nhvmkucdxklny28zcyjwnrnreq8z9yuhqcuusk2u65zgj43nlqclh8vp'],
                    type: TransferType.Send,
                    value: '29000',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle one output (with change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsSingleOutputSendWithChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(singleInputsSingleOutputSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsSingleOutputSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '29610',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    to: ['bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj'],
                    type: TransferType.Send,
                    value: '460729',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many unowned outputs (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsMultipleOutputSendNoChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(singleInputsMultipleOutputSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsMultipleOutputSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '43716',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
                    to: [
                      '1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g',
                      '1MJoEN3HLBRVR2anX6L95MRTpSuPNQHxTh',
                      '1LrmM2UyAsthKNE5VzNfKoTYmNZ2StD4vY',
                    ],
                    type: TransferType.Send,
                    value: '101835499',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many unowned outputs (with change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsMultipleOutputSendWithChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(singleInputsMultipleOutputSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsMultipleOutputSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '43716',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
                    to: [
                      '1MJoEN3HLBRVR2anX6L95MRTpSuPNQHxTh',
                      '1LrmM2UyAsthKNE5VzNfKoTYmNZ2StD4vY',
                    ],
                    type: TransferType.Send,
                    value: '2500955',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })

      describe('receive', () => {
        it('should handle one output', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsSingleOutputReceive.account),
            getTxHistory: vi.fn().mockResolvedValue(singleInputsSingleOutputReceive.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsSingleOutputReceive.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    to: ['bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj'],
                    type: TransferType.Receive,
                    value: '460729',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many outputs', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputsMultipleOutputReceive.account),
            getTxHistory: vi.fn().mockResolvedValue(singleInputsMultipleOutputReceive.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputsMultipleOutputReceive.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
                    to: ['1MJoEN3HLBRVR2anX6L95MRTpSuPNQHxTh'],
                    type: TransferType.Receive,
                    value: '1648959',
                  },
                  {
                    assetId: btcAssetId,
                    from: ['bc1qr35hws365juz5rtlsjtvmulu97957kqvr3zpw3'],
                    to: ['1LrmM2UyAsthKNE5VzNfKoTYmNZ2StD4vY'],
                    type: TransferType.Receive,
                    value: '851996',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })

      describe('self send', () => {
        it('should handle one output (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(singleInputSingleOutputSelfSendNoChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(singleInputSingleOutputSelfSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputSingleOutputSelfSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '26688',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qrgug46lmgumeksd277x9tuy4fq2gajvzw3z06n'],
                    to: ['bc1q694669rvzchjhtqgec77t2h25hsmh7kw33ywj3'],
                    type: TransferType.Send,
                    value: '177347',
                  },
                  {
                    assetId: btcAssetId,
                    from: ['bc1qrgug46lmgumeksd277x9tuy4fq2gajvzw3z06n'],
                    to: ['bc1q694669rvzchjhtqgec77t2h25hsmh7kw33ywj3'],
                    type: TransferType.Receive,
                    value: '177347',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle one output (with change)', async () => {
          args.providers.http = {
            getAccount: vi
              .fn()
              .mockResolvedValue(singleInputSingleOutputSelfSendWithChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(singleInputSingleOutputSelfSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = singleInputSingleOutputSelfSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '29610',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    to: [
                      'bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj',
                      'bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7',
                    ],
                    type: TransferType.Send,
                    value: '3330841',
                  },
                  {
                    assetId: btcAssetId,
                    from: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    to: ['bc1q4rdl57tx0erk3fmcenex3xf3u0lsa9zy5henaj'],
                    type: TransferType.Receive,
                    value: '460729',
                  },
                  {
                    assetId: btcAssetId,
                    from: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    to: ['bc1qnd7dwpefxtyajcf083hsa2jyt4064ujckuudw7'],
                    type: TransferType.Receive,
                    value: '2870112',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })
    })

    describe('many inputs', () => {
      describe('send', () => {
        it('should handle one output (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsSingleOutputSendNoChange.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsSingleOutputSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsSingleOutputSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '30081',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qe2n2sy9p9eapepktavmd5jzup9uz49l3wm78ur',
                      'bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a',
                    ],
                    to: ['18dcXpWE2qZLNnbSa7z9RbPu618CfCSriL'],
                    type: TransferType.Send,
                    value: '27508',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle one output (with change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsSingleOutputSendWithChange.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsSingleOutputSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsSingleOutputSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '45705',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: ['bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw'],
                    type: TransferType.Send,
                    value: '1842915',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many outputs (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsManyOutputSendNoChange.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsManyOutputSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsManyOutputSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '45705',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: [
                      'bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw',
                      'bc1qecwsar98zpf7jma63qvfc2f586k9fn9kyvznr8',
                    ],
                    type: TransferType.Send,
                    value: '1863176',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many outputs (with change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsManyOutputSendWithChange.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsManyOutputSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsManyOutputSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '68250',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qg4tyzkzk55nfzln6a86ulsetqa9g3rynd6y06mm0zvpkmwgzzpuqxjll78',
                      'bc1q3lr33srfqzr2dqpthcp9ehlf0wxfnvks0r6szzkaqgpf5xck9uzsgryjmc',
                      'bc1qsm0vz7v96dt9pmmall4rq2e2yql0d0ppjedxfq5zyz35r4rvma4scaw3vm',
                    ],
                    to: [
                      'bc1qary3ng3wtlqvglqx3vdkqlw0d7j92qvcapdzekrsg8g9p3hve5us9w2snm',
                      'bc1qj22y0r5n73lk5fd7fzddv6kd7kaj78hlkqxslvuguhdvt6gu2tusxnqfjq',
                    ],
                    type: TransferType.Send,
                    value: '22513927',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })

      describe('receive', () => {
        it('should handle one output', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsSingleOutputReceive.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsSingleOutputReceive.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsSingleOutputReceive.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: ['bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw'],
                    type: TransferType.Receive,
                    value: '1842915',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle many outputs', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsManyOutputReceive.account),
            getTxHistory: vi.fn().mockResolvedValue(manyInputsManyOutputReceive.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsManyOutputReceive.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qg4tyzkzk55nfzln6a86ulsetqa9g3rynd6y06mm0zvpkmwgzzpuqxjll78',
                      'bc1q3lr33srfqzr2dqpthcp9ehlf0wxfnvks0r6szzkaqgpf5xck9uzsgryjmc',
                      'bc1qsm0vz7v96dt9pmmall4rq2e2yql0d0ppjedxfq5zyz35r4rvma4scaw3vm',
                    ],
                    to: ['bc1qary3ng3wtlqvglqx3vdkqlw0d7j92qvcapdzekrsg8g9p3hve5us9w2snm'],
                    type: TransferType.Receive,
                    value: '1118542',
                  },
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qg4tyzkzk55nfzln6a86ulsetqa9g3rynd6y06mm0zvpkmwgzzpuqxjll78',
                      'bc1q3lr33srfqzr2dqpthcp9ehlf0wxfnvks0r6szzkaqgpf5xck9uzsgryjmc',
                      'bc1qsm0vz7v96dt9pmmall4rq2e2yql0d0ppjedxfq5zyz35r4rvma4scaw3vm',
                    ],
                    to: ['bc1qj22y0r5n73lk5fd7fzddv6kd7kaj78hlkqxslvuguhdvt6gu2tusxnqfjq'],
                    type: TransferType.Receive,
                    value: '21395385',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })

      describe('self send', () => {
        it('should handle one output (no change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsSingleOutputSelfSendNoChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(manyInputsSingleOutputSelfSendNoChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsSingleOutputSelfSendNoChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '30081',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qe2n2sy9p9eapepktavmd5jzup9uz49l3wm78ur',
                      'bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a',
                    ],
                    to: ['bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a'],
                    type: TransferType.Send,
                    value: '27508',
                  },
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1qe2n2sy9p9eapepktavmd5jzup9uz49l3wm78ur',
                      'bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a',
                    ],
                    to: ['bc1qgx9p5sratw7xm54f7cwjgkzmkm8pnm58xnc00a'],
                    type: TransferType.Receive,
                    value: '27508',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })

        it('should handle one output (with change)', async () => {
          args.providers.http = {
            getAccount: vi.fn().mockResolvedValue(manyInputsSingleOutputSelfSendWithChange.account),
            getTxHistory: vi
              .fn()
              .mockResolvedValue(manyInputsSingleOutputSelfSendWithChange.txHistory),
          } as any

          const pubkey = 'testKey'
          const adapter = new bitcoin.ChainAdapter(args)
          const tx = manyInputsSingleOutputSelfSendWithChange.txHistory.txs[0]

          const expected: TxHistoryResponse = {
            cursor: '',
            pubkey,
            transactions: [
              {
                pubkey,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.timestamp,
                chainId: btcChainId,
                confirmations: tx.confirmations,
                fee: {
                  assetId: btcAssetId,
                  value: '45705',
                },
                status: TxStatus.Confirmed,
                transfers: [
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: [
                      'bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw',
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                    ],
                    type: TransferType.Send,
                    value: '1863176',
                  },
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: ['bc1qzwqpxvfyl539ll8nw56xy9jn3flpx53nnm5zyw'],
                    type: TransferType.Receive,
                    value: '1842915',
                  },
                  {
                    assetId: btcAssetId,
                    from: [
                      'bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd',
                      'bc1q58ar8thgtxagewupgk2mremryvvq7wr87tw6ga',
                    ],
                    to: ['bc1q5ahw788dkrqlukawnymvpp9vz72qmu074tr4kd'],
                    type: TransferType.Receive,
                    value: '20261',
                  },
                ],
                txid: tx.txid,
              },
            ],
          }

          const actual = await adapter.getTxHistory({ pubkey })

          expect(actual).toEqual(expected)
        })
      })
    })
  })

  describe('buildSendTransaction', () => {
    it('should return a formatted BTCSignTx object for a valid BuildSendTxInput parameter', async () => {
      const wallet: any = await getWallet()

      args.providers.http = {
        getUtxos: vi.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: vi.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: vi.fn().mockResolvedValue(getAccountMockResponse),
        getNetworkFees: vi.fn().mockResolvedValue(getNetworkFeesMockedResponse),
      } as any

      const adapter = new bitcoin.ChainAdapter(args)

      const accountNumber = 0

      const txInput: BuildSendTxInput<KnownChainIds.BitcoinMainnet> = {
        accountNumber,
        to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
        value: '400',
        wallet,
        chainSpecific: {
          accountType: UtxoAccountType.SegwitNative,
          satoshiPerByte: '1',
        },
      }

      await expect(adapter.buildSendTransaction(txInput)).resolves.toStrictEqual({
        txToSign: {
          coin: 'Bitcoin',
          inputs: [
            {
              addressNList: [2147483732, 2147483648, 2147483648, 0, 1],
              scriptType: 'p2wpkh',
              amount: '31961',
              vout: 0,
              txid: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
              hex: '010000000180457afc57604fed35cc8cee29e602432c87125b9cabbcc8fc407749fe0fabfe010000006b483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126ffffffff02d97c0000000000001600140c0585f37ff3f9f127c9788941d6082cf7aa012173df0000000000001976a914b22138dfe140e4611b98bdb728eed04beed754c488ac00000000',
            },
          ],
          opReturnData: undefined,
          outputs: [
            {
              addressType: 'spend',
              amount: '400',
              address: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
            },
            {
              addressType: 'change',
              amount: '31335',
              addressNList: [2147483732, 2147483648, 2147483648, 1, 0],
              scriptType: 'p2wpkh',
              isChange: true,
            },
          ],
        },
      })
      expect(args.providers.http.getUtxos).toHaveBeenCalledTimes(1)
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
      expect(args.providers.http.getTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('signTransaction', () => {
    it('should sign a properly formatted signTxInput object', async () => {
      const wallet: any = await getWallet()

      args.providers.http = {
        getUtxos: vi.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: vi.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: vi.fn().mockResolvedValue(getAccountMockResponse),
        getNetworkFees: vi.fn().mockResolvedValue(getNetworkFeesMockedResponse),
      } as any

      const adapter = new bitcoin.ChainAdapter(args)

      const accountNumber = 0

      const txInput: BuildSendTxInput<KnownChainIds.BitcoinMainnet> = {
        accountNumber,
        to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
        value: '400',
        wallet,
        chainSpecific: {
          accountType: UtxoAccountType.SegwitNative,
          satoshiPerByte: '1',
        },
      }

      const unsignedTx = await adapter.buildSendTransaction(txInput)

      const signedTx = await adapter.signTransaction({
        wallet,
        txToSign: unsignedTx?.txToSign,
      })

      expect(signedTx).toEqual(
        '0100000000010105abd41ac558c186429b77a2344106bdd978955fc407e3363239864cb479b9ad0000000000ffffffff02900100000000000016001408450440a15ea38314c52d5c9ae6201857d7cf7a677a000000000000160014bf44db911ae5acc9cffcc1bbb9622ddda4a1112b024730440220106d6510888c70719b98069ccfa9dc92db248c1f5b7572d5cf86f3db1d371bf40220118ca57a08ed36f94772a5fbd2491a713fcb250a5ccb5e498ba70de8653763ff0121029dc27a53da073b1fea5601cf370d02d3b33cf572156c3a6df9d5c03c5dbcdcd700000000',
      )
    })
  })

  describe('broadcastTransaction', () => {
    it('is should correctly call broadcastTransaction', async () => {
      const sendDataResult = 'success'
      args.providers.http = {
        sendTx: vi.fn().mockResolvedValue(sendDataResult),
      } as any
      const adapter = new bitcoin.ChainAdapter(args)
      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction({
        senderAddress: '0x1234',
        receiverAddress: '0x1234',
        hex: mockTx,
      })
      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(sendDataResult)
    })
  })

  describe('getFeeData', () => {
    it('should return current BTC network fees', async () => {
      args.providers.http = {
        getNetworkFees: vi.fn().mockResolvedValue(getNetworkFeesMockedResponse),
        getUtxos: vi.fn().mockResolvedValue([]),
      } as any

      const adapter = new bitcoin.ChainAdapter(args)

      const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
        to: '0x',
        value: '0',
        chainSpecific: { pubkey: '123' },
      }
      const data = await adapter.getFeeData(getFeeDataInput)
      expect(data).toEqual(
        expect.objectContaining({
          average: { chainSpecific: { satoshiPerByte: '1' }, txFee: '44' },
          fast: { chainSpecific: { satoshiPerByte: '1' }, txFee: '44' },
          slow: { chainSpecific: { satoshiPerByte: '1' }, txFee: '44' },
        }),
      )
    })
  })

  describe('getAddress', () => {
    it("should return a p2pkh address for valid derivation root path parameters (m/44'/0'/0'/0/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.P2pkh,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM')
    })

    it("should return a valid p2pkh address for the first receive index path (m/44'/0'/0'/0/1)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.P2pkh,
        addressIndex: 1,
      })
      expect(addr).toStrictEqual('1Jxtem176sCXHnK7QCShoafF5VtWvMa7eq')
    })

    it("should return a valid p2pkh change address for the first receive index path (m/44'/0'/0'/1/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.P2pkh,
        isChange: true,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('13ZD8S4qR6h4GvkAZ2ht7rpr15TFXYxGCx')
    })

    it("should return a valid p2pkh address at the 2nd account root path (m/44'/0'/1'/0/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 1,
        accountType: UtxoAccountType.P2pkh,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('1K2oFer6nGoXSPspeB5Qvt4htJvw3y31XW')
    })

    it("should return a p2wpkh address for valid derivation root path parameters (m/84'/0'/0'/0/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.SegwitNative,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('bc1qkkr2uvry034tsj4p52za2pg42ug4pxg5qfxyfa')
    })

    it("should return a valid p2wpkh address for the first receive index path (m/84'/0'/0'/0/1)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.SegwitNative,
        addressIndex: 1,
      })
      expect(addr).toStrictEqual('bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy')
    })

    it("should return a valid p2wpkh change address for the first receive index path (m/44'/0'/0'/1/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 0,
        accountType: UtxoAccountType.SegwitNative,
        isChange: true,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('bc1qhazdhyg6ukkvnnlucxamjc3dmkj2zyfte0lqa9')
    })

    it("should return a valid p2wpkh address at the 2nd account root path (m/84'/0'/1'/0/0)", async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const addr = await adapter.getAddress({
        wallet: await getWallet(),
        accountNumber: 1,
        accountType: UtxoAccountType.SegwitNative,
        addressIndex: 0,
      })
      expect(addr).toStrictEqual('bc1qgawuludfvrdxfq0x55k26ydtg2hrx64jp3u6am')
    })

    it('should not show address on device by default', async () => {
      const wallet = (await getWallet()) as BTCWallet
      wallet.btcGetAddress = vi.fn().mockResolvedValue('bc1qgawuludfvrdxfq0x55k26ydtg2hrx64jp3u6am')

      const adapter = new bitcoin.ChainAdapter(args)
      await adapter.getAddress({
        accountNumber: 1,
        wallet,
        accountType: UtxoAccountType.SegwitNative,
        addressIndex: 0,
      })

      expect(wallet.btcGetAddress).toHaveBeenCalledWith({
        addressNList: [2147483732, 2147483648, 2147483649, 0, 0],
        coin: 'Bitcoin',
        scriptType: 'p2wpkh',
        showDisplay: false,
      })
    })
  })

  describe('validateAddress', () => {
    it('should return true for a valid address', async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const referenceAddress = '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx'
      const expectedReturnValue = { valid: true, result: 'valid' }
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new bitcoin.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = { valid: false, result: 'invalid' }
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })

  describe('getBip44Params', () => {
    const adapter = new bitcoin.ChainAdapter(args)
    it('should throw for undefined accountType', () => {
      expect(() => {
        adapter.getBip44Params({ accountNumber: 0, accountType: undefined })
      }).toThrow('unsupported account type: undefined')
    })
    it('should always be coinType 0', () => {
      for (const accountType of adapter.getSupportedAccountTypes()) {
        const r = adapter.getBip44Params({ accountNumber: 0, accountType })
        expect(r.coinType).toStrictEqual(0)
      }
    })
    it('should properly map account types to purposes', () => {
      const accountTypes: UtxoAccountType[] = [
        UtxoAccountType.P2pkh,
        UtxoAccountType.SegwitP2sh,
        UtxoAccountType.SegwitNative,
      ]
      const expected: Bip44Params[] = [
        { purpose: 44, coinType: 0, accountNumber: 0, isChange: false, addressIndex: undefined },
        { purpose: 49, coinType: 0, accountNumber: 0, isChange: false, addressIndex: undefined },
        { purpose: 84, coinType: 0, accountNumber: 0, isChange: false, addressIndex: undefined },
      ]
      accountTypes.forEach((accountType, i) => {
        const r = adapter.getBip44Params({ accountNumber: 0, accountType })
        expect(r).toStrictEqual(expected[i])
      })
    })
    it('should respect accountNumber', () => {
      const accountTypes: UtxoAccountType[] = [
        UtxoAccountType.P2pkh,
        UtxoAccountType.SegwitP2sh,
        UtxoAccountType.SegwitNative,
      ]
      const expected: Bip44Params[] = [
        { purpose: 44, coinType: 0, accountNumber: 0, isChange: false, addressIndex: undefined },
        { purpose: 49, coinType: 0, accountNumber: 1, isChange: false, addressIndex: undefined },
        { purpose: 84, coinType: 0, accountNumber: 2, isChange: false, addressIndex: undefined },
      ]
      accountTypes.forEach((accountType, accountNumber) => {
        const r = adapter.getBip44Params({ accountNumber, accountType })
        expect(r).toStrictEqual(expected[accountNumber])
      })
    })
    it('should throw for negative accountNumber', () => {
      expect(() => {
        adapter.getBip44Params({ accountNumber: -1, accountType: UtxoAccountType.P2pkh })
      }).toThrow('accountNumber must be >= 0')
    })
  })
})
