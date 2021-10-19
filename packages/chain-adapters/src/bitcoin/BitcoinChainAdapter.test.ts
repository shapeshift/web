import { BuildSendTxInput } from './../../../types/src/chain-adapters/index'
// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test BitcoinChainAdapter
 * @group unit
 */
import { BTCInputScriptType, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP32Params, ChainTypes, ChainAdapters } from '@shapeshiftoss/types'
import { bitcoin } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import { BitcoinChainAdapter } from '.'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const getWallet = async (): Promise<HDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test'
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const getUtxosMockResponse = {
  data: [
    {
      txid: 'ef935d850e7d596f98c6e24d5f25faa770f6e6d8e5eab94dea3e2154c3643986',
      vout: 0,
      value: '1598',
      height: 705718,
      confirmations: 2,
      address: 'bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy',
      path: "m/84'/0'/0'/0/1"
    },
    {
      txid: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
      vout: 0,
      value: '31961',
      height: 705718,
      confirmations: 2,
      address: 'bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy',
      path: "m/84'/0'/0'/0/1"
    }
  ]
}

const getAccountMockResponse = {
  data: {
    balance: '33559',
    chain: 'bitcoin',
    nextChangeAddressIndex: 0,
    nextReceiveAddressIndex: 2,
    network: 'MAINNET',
    pubkey:
      'zpub6qSSRL9wLd6LNee7qjDEuULWccP5Vbm5nuX4geBu8zMCQBWsF5Jo5UswLVxFzcbCMr2yQPG27ZhDs1cUGKVH1RmqkG1PFHkEXyHG7EV3ogY',
    symbol: 'BTC'
  }
}

const getTransactionMockResponse = {
  data: {
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
          asm:
            '3045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad[ALL] 027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126',
          hex:
            '483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126'
        },
        sequence: 4294967295
      }
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
          addresses: ['bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy']
        }
      },
      {
        value: 0.00057203,
        n: 1,
        scriptPubKey: {
          asm:
            'OP_DUP OP_HASH160 b22138dfe140e4611b98bdb728eed04beed754c4 OP_EQUALVERIFY OP_CHECKSIG',
          hex: '76a914b22138dfe140e4611b98bdb728eed04beed754c488ac',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['1HEs5TpTvrWHDFqLqfZnXFLFc4hqHjHe5M']
        }
      }
    ],
    hex:
      '010000000180457afc57604fed35cc8cee29e602432c87125b9cabbcc8fc407749fe0fabfe010000006b483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126ffffffff02d97c0000000000001600140c0585f37ff3f9f127c9788941d6082cf7aa012173df0000000000001976a914b22138dfe140e4611b98bdb728eed04beed754c488ac00000000',
    blockhash: '000000000000000000033c8ec44721d844aa63f4312d65261eb4c4d0cd4e0379',
    confirmations: 2,
    time: 1634662208,
    blocktime: 1634662208
  }
}

describe('BitcoinChainAdapter', () => {
  describe('getType', () => {
    it('should return ChainTypes.Bitcoin', async () => {
      const provider: any = jest.fn()
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })
      const type = btcChainAdapter.getType()
      expect(type).toEqual(ChainTypes.Bitcoin)
    })
  })

  describe('getAccount', () => {
    it('should return account info for a specified address', async () => {
      const provider: any = {
        getAccount: jest.fn().mockResolvedValue({
          data: {
            pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
            balance: '0'
          }
        })
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const exampleResponse: bitcoin.api.BitcoinAccount = {
        pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
        balance: '0'
      }
      const data = await btcChainAdapter.getAccount('SomeFakeAddress')
      expect(data).toMatchObject(exampleResponse)
      expect(provider.getAccount).toHaveBeenCalled()
    })

    it('should throw for an unspecified address', async () => {
      const provider: any = {
        getAccount: jest.fn<any, any>().mockResolvedValue({
          pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
          balance: '0'
        })
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      await expect(btcChainAdapter.getAccount('')).rejects.toThrow(
        'BitcoinChainAdapter: pubkey parameter is not defined'
      )
    })
  })

  describe('getTxHistory', () => {
    it('should return tx history for a specified address', async () => {
      const provider: any = {
        getTxHistory: jest.fn().mockResolvedValue({
          data: {
            page: 1,
            totalPages: 1,
            txs: 1,
            transactions: [
              {
                network: 'MAINNET',
                chain: 'bitcoin',
                symbol: 'BTC',
                txid: '123',
                status: 'confirmed',
                from: 'abc',
                value: '1337',
                fee: '1'
              }
            ]
          }
        })
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const pubkey = '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx'
      await expect(btcChainAdapter.getTxHistory({ pubkey })).resolves.toStrictEqual({
        page: 1,
        totalPages: 1,
        txs: 1,
        transactions: [
          {
            network: 'MAINNET',
            chain: 'bitcoin',
            symbol: 'BTC',
            txid: '123',
            status: 'confirmed',
            from: 'abc',
            value: '1337',
            fee: '1',
            chainSpecific: {
              opReturnData: ''
            }
          }
        ]
      })
      expect(provider.getTxHistory).toHaveBeenCalledTimes(1)
    })

    it('should fail for an unspecified address', async () => {
      const provider: any = {
        getTxHistory: jest.fn().mockResolvedValue({
          data: {}
        })
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const pubkey = ''
      await expect(btcChainAdapter.getTxHistory({ pubkey })).rejects.toThrow(
        'pubkey parameter is not defined'
      )
    })
  })

  describe('buildSendTransaction', () => {
    it('should return a formatted BTCSignTx object for a valid BuildSendTxInput parameter', async () => {
      const mockFeeData = {
        fast: { feePerUnit: '1' },
        average: { feePerUnit: '1' },
        slow: { feePerUnit: '1' }
      }
      mockedAxios.get.mockResolvedValueOnce(mockFeeData)
      const wallet: any = await getWallet()
      const provider: any = {
        getUtxos: jest.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: jest.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: jest.fn().mockResolvedValue(getAccountMockResponse)
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        purpose: 84,
        coinType: 0,
        accountNumber: 0,
        isChange: false
      }

      const txInput: ChainAdapters.BuildSendTxInput = {
        bip32Params,
        recipients: [{ address: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4', value: 400 }],
        wallet,
        opReturnData: 'nm, u',
        feeSpeed: ChainAdapters.FeeDataKey.Slow
      }

      await expect(btcChainAdapter.buildSendTransaction(txInput)).resolves.toStrictEqual({
        txToSign: {
          coin: 'Bitcoin',
          inputs: [
            {
              addressNList: [2147483732, 2147483648, 2147483648, 0, 1],
              scriptType: 'p2wpkh',
              amount: '31961',
              vout: 0,
              txid: 'adb979b44c86393236e307c45f9578d9bd064134a2779b4286c158c51ad4ab05',
              hex:
                '010000000180457afc57604fed35cc8cee29e602432c87125b9cabbcc8fc407749fe0fabfe010000006b483045022100cd627a0577d35454ced7f0a6ef8a3d3cf11c0f8696bda18062025478e0fc866002206c8ac559dc6bd851bdf00e33c1602fcaeee9d16b35d21b548529825f12dfe5ad0121027751a74f251ba2657ec2a2f374ce7d5ba1548359749823a59314c54a0670c126ffffffff02d97c0000000000001600140c0585f37ff3f9f127c9788941d6082cf7aa012173df0000000000001976a914b22138dfe140e4611b98bdb728eed04beed754c488ac00000000'
            }
          ],
          outputs: [
            {
              addressType: 'spend',
              amount: '400',
              address: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
              scriptType: 'p2wpkh'
            },
            {
              addressType: 'change',
              amount: '31335',
              addressNList: [2147483732, 2147483648, 2147483648, 1, 0],
              scriptType: 'p2wpkh',
              isChange: true
            }
          ],
          fee: 226
        },
        estimatedFees: {
          fast: { feePerUnit: '1' },
          average: { feePerUnit: '1' },
          slow: { feePerUnit: '1' }
        }
      })
      expect(provider.getUtxos).toHaveBeenCalledTimes(1)
      expect(provider.getAccount).toHaveBeenCalledTimes(1)
      expect(provider.getTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('signTransaction', () => {
    it('should sign a properly formatted signTxInput object', async () => {
      const mockFeeData = {
        fast: { feePerUnit: '1' },
        average: { feePerUnit: '1' },
        slow: { feePerUnit: '1' }
      }
      mockedAxios.get.mockResolvedValueOnce(mockFeeData)
      const wallet: any = await getWallet()
      const provider: any = {
        getUtxos: jest.fn<any, any>().mockResolvedValue(getUtxosMockResponse),
        getTransaction: jest.fn<any, any>().mockResolvedValue(getTransactionMockResponse),
        getAccount: jest.fn().mockResolvedValue(getAccountMockResponse)
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        purpose: 84,
        coinType: 0,
        accountNumber: 0,
        isChange: false
      }

      const txInput: ChainAdapters.BuildSendTxInput = {
        bip32Params,
        recipients: [{ address: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4', value: 400 }],
        wallet,
        opReturnData: 'sup fool',
        feeSpeed: ChainAdapters.FeeDataKey.Slow
      }

      const unsignedTx = await btcChainAdapter.buildSendTransaction(txInput)

      const signedTx = await btcChainAdapter.signTransaction({
        wallet,
        txToSign: unsignedTx?.txToSign
      })

      expect(signedTx).toEqual(
        '0100000000010105abd41ac558c186429b77a2344106bdd978955fc407e3363239864cb479b9ad0000000000ffffffff02900100000000000016001408450440a15ea38314c52d5c9ae6201857d7cf7a677a000000000000160014bf44db911ae5acc9cffcc1bbb9622ddda4a1112b024730440220106d6510888c70719b98069ccfa9dc92db248c1f5b7572d5cf86f3db1d371bf40220118ca57a08ed36f94772a5fbd2491a713fcb250a5ccb5e498ba70de8653763ff0121029dc27a53da073b1fea5601cf370d02d3b33cf572156c3a6df9d5c03c5dbcdcd700000000'
      )
    })
  })

  describe('broadcastTransaction', () => {
    it('is should correctly call broadcastTransaction', async () => {
      const sendDataResult = 'success'
      const provider: any = {
        sendTx: jest.fn().mockResolvedValue({ data: sendDataResult })
      }
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })
      const mockTx = '0x123'
      const result = await btcChainAdapter.broadcastTransaction(mockTx)
      expect(provider.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(sendDataResult)
    })
  })

  describe.skip('getFeeData', () => {
    it('should return current BTC network fees', async () => {
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const data = await btcChainAdapter.getFeeData()
      expect(data).toEqual(
        expect.objectContaining({
          fast: { feePerUnit: expect.any(String) },
          average: { feePerUnit: expect.any(String) },
          slow: { feePerUnit: expect.any(String) }
        })
      )
    })
  })

  describe('getAddress', () => {
    it("should return a p2pkh address for valid derivation root path parameters (m/44'/0'/0'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 44,
        accountNumber: 0,
        isChange: false,
        index: 0
      }
      const scriptType = BTCInputScriptType.SpendAddress
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM')
    })

    it("should return a valid p2pkh address for the first receive index path (m/44'/0'/0'/0/1)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 44,
        accountNumber: 0,
        index: 1,
        isChange: false
      }
      const scriptType = BTCInputScriptType.SpendAddress
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('1Jxtem176sCXHnK7QCShoafF5VtWvMa7eq')
    })

    it("should return a valid p2pkh change address for the first receive index path (m/44'/0'/0'/1/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 44,
        accountNumber: 0,
        index: 0,
        isChange: true
      }
      const scriptType = BTCInputScriptType.SpendAddress
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('13ZD8S4qR6h4GvkAZ2ht7rpr15TFXYxGCx')
    })

    it("should return a valid p2pkh address at the 2nd account root path (m/44'/0'/1'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })
      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 44,
        accountNumber: 1,
        index: 0,
        isChange: false
      }
      const scriptType = BTCInputScriptType.SpendAddress
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('1K2oFer6nGoXSPspeB5Qvt4htJvw3y31XW')
    })

    it("should return a p2wpkh address for valid derivation root path parameters (m/84'/0'/0'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 84,
        accountNumber: 0,
        isChange: false,
        index: 0
      }
      const scriptType = BTCInputScriptType.SpendWitness
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('bc1qkkr2uvry034tsj4p52za2pg42ug4pxg5qfxyfa')
    })

    it("should return a valid p2wpkh address for the first receive index path (m/84'/0'/0'/0/1)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 84,
        accountNumber: 0,
        index: 1,
        isChange: false
      }
      const scriptType = BTCInputScriptType.SpendWitness
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('bc1qpszctuml70ulzf7f0zy5r4sg9nm65qfpgcw0uy')
    })

    it("should return a valid p2wpkh change address for the first receive index path (m/44'/0'/0'/1/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 84,
        accountNumber: 0,
        index: 0,
        isChange: true
      }
      const scriptType = BTCInputScriptType.SpendWitness
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('bc1qhazdhyg6ukkvnnlucxamjc3dmkj2zyfte0lqa9')
    })

    it("should return a valid p2wpkh address at the 2nd account root path (m/84'/0'/1'/0/0)", async () => {
      const wallet: HDWallet = await getWallet()
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })
      const bip32Params: BIP32Params = {
        coinType: 0,
        purpose: 84,
        accountNumber: 1,
        index: 0,
        isChange: false
      }
      const scriptType = BTCInputScriptType.SpendWitness
      const addr: string | undefined = await btcChainAdapter.getAddress({
        bip32Params,
        wallet,
        scriptType
      })
      expect(addr).toStrictEqual('bc1qgawuludfvrdxfq0x55k26ydtg2hrx64jp3u6am')
    })
  })

  describe('validateAddress', () => {
    it('should return true for a valid address', async () => {
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const referenceAddress = '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx'
      const expectedReturnValue = { valid: true, result: 'valid' }
      const res = await btcChainAdapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const provider: any = {}
      const btcChainAdapter = new BitcoinChainAdapter({ provider, coinName: 'Bitcoin' })

      const referenceAddress = ''
      const expectedReturnValue = { valid: false, result: 'invalid' }
      const res = await btcChainAdapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })
})
