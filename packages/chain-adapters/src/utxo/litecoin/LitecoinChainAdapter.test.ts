// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Test LitecoinChainAdapter
 * @group unit
 */

import { ltcAssetId, ltcChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { NativeAdapterArgs } from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'

import type { Account, BuildSendTxInput, GetFeeDataInput } from '../../types'
import type { ChainAdapterArgs, UtxoChainId } from '../UtxoBaseAdapter'
import * as litecoin from './LitecoinChainAdapter'

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'
const VALID_CHAIN_ID = ltcChainId
const VALID_ASSET_ID = ltcAssetId

const getWallet = async (): Promise<HDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test',
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const pubkey = 'ltc1q9ql7xaq9z6r52pvsqsfgc69xt5k0yj0nnlzthh'

const getUtxosMockResponse = [
  {
    txid: '8edffe2aca0056b3bba448ab0f4980c9ba22728aa47a1f7fc794718f051f21df',
    vout: 1,
    value: '7132554366',
    height: 4312262,
    confirmations: 30,
    address: pubkey,
    path: "m/44'/2'/0'/1/13",
  },
]

const getAccountMockResponse = {
  balance: '7332775620',
  chain: 'litecoin',
  nextChangeAddressIndex: 0,
  nextReceiveAddressIndex: 2,
  network: 'MAINNET',
  pubkey:
    'zpub6sFGAsUva7JH1QSoCMk6aP92E1K5Lx8qtuQsdNeHvUzFdNi6AtsgwEVU6JrwMsfKARSVkYyN66qeiPdfGsoz3cLUVJ8uhsKX65oLvh1yBXj',
  symbol: 'LTC',
}

const getTransactionMockResponse = {
  txid: '8edffe2aca0056b3bba448ab0f4980c9ba22728aa47a1f7fc794718f051f21df',
  hash: '8edffe2aca0056b3bba448ab0f4980c9ba22728aa47a1f7fc794718f051f21df',
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
        addresses: ['ltc1qg393d8exgptffxmeddwsa96u8qjk56fjk5sncj'],
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
        addresses: ['ltc1q53sqm34syrkgg35k0xqkv580vdetchduuxhmzy'],
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

describe('LitecoinChainAdapter', () => {
  let args: ChainAdapterArgs = {} as any

  beforeEach(() => {
    args = {
      providers: {
        http: {} as any,
        ws: {} as any,
      },
      coinName: 'Litecoin',
      chainId: KnownChainIds.LitecoinMainnet,
    }
  })

  describe('constructor', () => {
    it('should return chainAdapter with Litecoin chainId', () => {
      const chainId = new litecoin.ChainAdapter(args).getChainId()
      expect(chainId).toEqual(VALID_CHAIN_ID)
    })

    it('should return chainAdapter with Litecoin assetId', () => {
      const assetId = new litecoin.ChainAdapter(args).getFeeAssetId()
      expect(assetId).toEqual(VALID_ASSET_ID)
    })

    it('should throw if called with invalid chainId', () => {
      args.chainId = 'INVALID_CHAINID' as KnownChainIds.LitecoinMainnet
      expect(() => new litecoin.ChainAdapter(args)).toThrow()
    })

    it('should throw if called with unsupported chainId', () => {
      args.chainId = 'eip155:1' as KnownChainIds.LitecoinMainnet
      expect(() => new litecoin.ChainAdapter(args)).toThrow()
    })

    it('should use default chainId if no arg chainId provided.', () => {
      delete args.chainId
      const chainId = new litecoin.ChainAdapter(args).getChainId()
      expect(chainId).toEqual(ltcChainId)
    })
  })

  describe('getType', () => {
    it('should return KnownChainIds.LitecoinMainnet', () => {
      const type = new litecoin.ChainAdapter(args).getType()
      expect(type).toEqual(KnownChainIds.LitecoinMainnet)
    })
  })

  describe('getAccount', () => {
    it('should return account info for a specified address', async () => {
      args.providers.http = {
        getAccount: jest.fn().mockResolvedValue({
          pubkey,
          balance: '100',
          unconfirmedBalance: '50',
          addresses: [],
          nextChangeAddressIndex: 0,
          nextReceiveAddressIndex: 0,
        }),
      } as any

      const adapter = new litecoin.ChainAdapter(args)
      const data = await adapter.getAccount(pubkey)
      const expected: Account<KnownChainIds.LitecoinMainnet> = {
        pubkey,
        chain: KnownChainIds.LitecoinMainnet,
        balance: '150',
        chainId: ltcChainId,
        assetId: ltcAssetId,
        chainSpecific: {
          addresses: [],
          nextChangeAddressIndex: 0,
          nextReceiveAddressIndex: 0,
        },
      }

      expect(data).toMatchObject(expected)
      expect(args.providers.http.getAccount).toHaveBeenCalled()
    })
  })

  describe('buildSendTransaction', () => {
    it('should return a formatted BTCSignTx object for a valid BuildSendTxInput parameter', async () => {
      const wallet: any = await getWallet()

      args.providers.http = {
        getUtxos: jest.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: jest.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: jest.fn().mockResolvedValue(getAccountMockResponse),
        getNetworkFees: jest.fn().mockResolvedValue(getNetworkFeesMockedResponse),
      } as any

      const adapter = new litecoin.ChainAdapter(args)

      const accountNumber = 0

      const txInput: BuildSendTxInput<KnownChainIds.LitecoinMainnet> = {
        accountNumber,
        to: pubkey,
        value: '400',
        wallet,
        chainSpecific: {
          accountType: UtxoAccountType.P2pkh,
          satoshiPerByte: '1',
        },
      }

      await expect(adapter.buildSendTransaction(txInput)).resolves.toStrictEqual({
        txToSign: {
          coin: 'Litecoin',
          inputs: [
            {
              addressNList: [2147483692, 2147483650, 2147483648, 1, 13],
              scriptType: 'p2pkh',
              amount: '7132554366',
              vout: 1,
              txid: '8edffe2aca0056b3bba448ab0f4980c9ba22728aa47a1f7fc794718f051f21df',
              hex: '010000000180457afc57604fed35cc8cee29e602432c87125b9cabbcc8fc407749fe0fabfe010000006b483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126ffffffff02d97c0000000000001600140c0585f37ff3f9f127c9788941d6082cf7aa012173df0000000000001976a914b22138dfe140e4611b98bdb728eed04beed754c488ac00000000',
            },
          ],
          opReturnData: undefined,
          outputs: [
            {
              addressType: 'spend',
              amount: '400',
              address: pubkey,
            },
            {
              addressType: 'change',
              amount: '7132553740',
              addressNList: [2147483692, 2147483650, 2147483648, 1, 0],
              scriptType: 'p2pkh',
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
    // skip for the moment (need to fill mock data w/ historical receive and spend utxos)
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should sign a properly formatted signTxInput object', async () => {
      const wallet: any = await getWallet()

      args.providers.http = {
        getUtxos: jest.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: jest.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: jest.fn().mockResolvedValue(getAccountMockResponse),
        getNetworkFees: jest.fn().mockResolvedValue(getNetworkFeesMockedResponse),
      } as any

      const adapter = new litecoin.ChainAdapter(args)

      const accountNumber = 0

      const txInput: BuildSendTxInput<KnownChainIds.LitecoinMainnet> = {
        accountNumber,
        to: pubkey,
        value: '400000000',
        wallet,
        chainSpecific: {
          from: 'someDerivedPubkeyFromXpub',
          accountType: UtxoAccountType.P2pkh,
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
        sendTx: jest.fn().mockResolvedValue(sendDataResult),
      } as any
      const adapter = new litecoin.ChainAdapter(args)
      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction(mockTx)
      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(sendDataResult)
    })
  })

  describe('getFeeData', () => {
    it('should return current LTC network fees', async () => {
      args.providers.http = {
        getNetworkFees: jest.fn().mockResolvedValue(getNetworkFeesMockedResponse),
        getUtxos: jest.fn().mockResolvedValue([]),
      } as any

      const adapter = new litecoin.ChainAdapter(args)

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
    it("should return a p2pkh address for valid first receive index (m/44'/2'/0'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const adapter = new litecoin.ChainAdapter(args)
      const accountNumber = 0
      const index = 0

      const addr: string | undefined = await adapter.getAddress({
        accountNumber,
        wallet,
        accountType: UtxoAccountType.P2pkh,
        index,
      })
      expect(addr).toStrictEqual('LYXTv5RdsPYKC4qGmb6x6SuKoFMxUdSjLQ')
    })

    it("should return a valid p2pkh address for the 2nd receive index path (m/44'/2'/0'/0/1)", async () => {
      const wallet: HDWallet = await getWallet()
      const adapter = new litecoin.ChainAdapter(args)
      const accountNumber = 0
      const index = 1

      const addr: string | undefined = await adapter.getAddress({
        wallet,
        accountNumber,
        accountType: UtxoAccountType.P2pkh,
        index,
      })
      expect(addr).toStrictEqual('LgCD3vmz2TkYGbaDDy1YRyT4JwL95XpYPw')
    })

    it("should return a valid p2pkh change address for the first change index path (m/44'/2'/0'/1/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const adapter = new litecoin.ChainAdapter(args)
      const accountNumber = 0
      const index = 0
      const isChange = true

      const addr: string | undefined = await adapter.getAddress({
        accountNumber,
        wallet,
        accountType: UtxoAccountType.P2pkh,
        isChange,
        index,
      })
      expect(addr).toStrictEqual('LfYSvfC3L9XyFGL42zjodCiwTSoh772XD9')
    })

    it("should return a valid p2pkh address at the 2nd account root path (m/44'/2'/1'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const adapter = new litecoin.ChainAdapter(args)
      const accountNumber = 1
      const index = 0

      const addr: string | undefined = await adapter.getAddress({
        wallet,
        accountNumber,
        accountType: UtxoAccountType.P2pkh,
        index,
      })
      expect(addr).toStrictEqual('LeRfQnpXQDe8nth9EWkduPnfkYuD1ASwAb')
    })
  })

  describe('validateAddress', () => {
    it('should return true for a valid address', async () => {
      const adapter = new litecoin.ChainAdapter(args)
      const referenceAddress = pubkey
      const expectedReturnValue = { valid: true, result: 'valid' }
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new litecoin.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = { valid: false, result: 'invalid' }
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })
  describe('getBIP44Params', () => {
    const adapter = new litecoin.ChainAdapter(args)
    it('should throw for undefined accountType', () => {
      expect(() => {
        adapter.getBIP44Params({ accountNumber: 0, accountType: undefined })
      }).toThrow('not a supported accountType undefined')
    })
    it('should always be coinType 2', () => {
      for (const accountType of adapter.getSupportedAccountTypes()) {
        const r = adapter.getBIP44Params({ accountNumber: 0, accountType })
        expect(r.coinType).toStrictEqual(2)
      }
    })
    it('should properly map account types to purposes', () => {
      const accountTypes: UtxoAccountType[] = [
        UtxoAccountType.P2pkh,
        UtxoAccountType.SegwitP2sh,
        UtxoAccountType.SegwitNative,
      ]
      const index = undefined
      const expected: BIP44Params[] = [
        { purpose: 44, coinType: 2, accountNumber: 0, isChange: false, index },
        { purpose: 49, coinType: 2, accountNumber: 0, isChange: false, index },
        { purpose: 84, coinType: 2, accountNumber: 0, isChange: false, index },
      ]
      accountTypes.forEach((accountType, i) => {
        const r = adapter.getBIP44Params({ accountNumber: 0, accountType })
        expect(r).toStrictEqual(expected[i])
      })
    })
    it('should respect accountNumber', () => {
      const accountTypes: UtxoAccountType[] = [
        UtxoAccountType.P2pkh,
        UtxoAccountType.SegwitP2sh,
        UtxoAccountType.SegwitNative,
      ]
      const index = undefined
      const expected: BIP44Params[] = [
        { purpose: 44, coinType: 2, accountNumber: 0, isChange: false, index },
        { purpose: 49, coinType: 2, accountNumber: 1, isChange: false, index },
        { purpose: 84, coinType: 2, accountNumber: 2, isChange: false, index },
      ]
      accountTypes.forEach((accountType, accountNumber) => {
        const r = adapter.getBIP44Params({ accountNumber, accountType })
        expect(r).toStrictEqual(expected[accountNumber])
      })
    })
    it('should throw for negative accountNumber', () => {
      expect(() => {
        adapter.getBIP44Params({ accountNumber: -1, accountType: UtxoAccountType.P2pkh })
      }).toThrow('accountNumber must be >= 0')
    })
  })
})
