// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test BitcoinChainAdapter
 * @group unit
 */
import { ChainAdapterManager } from '../ChainAdapterManager'
import { BTCInputScriptType, BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { ChainAdapter } from '../'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BitcoinAPI } from '@shapeshiftoss/unchained-client'
import dotenv from 'dotenv'
import { BIP32Params, BuildSendTxInput, ChainTypes } from '@shapeshiftoss/types'
dotenv.config({
  path: __dirname + '/../../.env'
})

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const unchainedUrls = {
  [ChainTypes.Bitcoin]: 'http://localhost:31300',
  [ChainTypes.Ethereum]: 'http://localhost:31300'
}

let chainAdapterManager: ChainAdapterManager
let wallet: NativeHDWallet
let btcChainAdapter: ChainAdapter<ChainTypes.Bitcoin>
let address: string

const getWallet = async (): Promise<NativeHDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test'
  }
  wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

describe('BitcoinChainAdapter', () => {
  beforeAll(async () => {
    try {
      chainAdapterManager = new ChainAdapterManager(unchainedUrls)
    } catch (error) {
      console.log(
        'Could not instantiate new ChainAdapterManager. Is an Unchained instance running at either ',
        unchainedUrls
      )
    }
    wallet = await getWallet()
    btcChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
    const bip32Params: BIP32Params = {
      coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
      purpose: 44,
      accountNumber: 0,
      isChange: false,
      index: 0
    }
    const scriptType = BTCInputScriptType.SpendAddress
    address = (await btcChainAdapter.getAddress({ bip32Params, scriptType, wallet })) || ''
  })

  describe('getType', () => {
    it('should return ChainTypes.Bitcoin', async () => {
      const type = btcChainAdapter.getType()
      expect(type).toEqual(ChainTypes.Bitcoin)
    })
  })

  describe('getAccount', () => {
    it('should return account info for a specified address', async () => {
      const exampleResponse: BitcoinAPI.BitcoinAccount = {
        pubkey: '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx',
        balance: '0'
      }
      const data = await btcChainAdapter.getAccount(address)

      expect(data).toMatchObject(exampleResponse)
    })

    it('should throw for an unspecified address', async () => {
      await expect(btcChainAdapter.getAccount('')).rejects.toThrow(
        'BitcoinChainAdapter: pubkey parameter is not defined'
      )
    })
  })

  // describe('getTxHistory', () => {
  //   it('should return tx history for a specified address', async () => {
  //     const pubkey = '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx'
  //     const data = await btcChainAdapter.getTxHistory({ pubkey })
  //     expect(true).toEqual('unimplemented')
  //   })

  //   it('should fail for an unspecified address', async () => {
  //     const pubkey = ''
  //     await expect(btcChainAdapter.getTxHistory({ pubkey })).rejects.toThrow(
  //       "Parameter 'address' is not defined"
  //     )
  //     expect(true).toEqual('unimplemented')
  //   })
  // })

  describe('buildSendTransaction', () => {
    it('should return a formatted BTCSignTx object for a valid BuildSendTxInput parameter', async () => {
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
        purpose: 44,
        accountNumber: 0,
        isChange: false
      }
      const txInput: BuildSendTxInput = {
        bip32Params,
        recipients: [
          {
            address: '1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM',
            value: 2000
          }
        ],
        wallet,
        fee: '100',
        opReturnData: 'nm, u?'
      }
      const unsignedTx: BTCSignTx = (await btcChainAdapter.buildSendTransaction(txInput))
        ?.txToSign as BTCSignTx
      expect(unsignedTx).toBeDefined()
    })

    it('should return estimated fees for a valid BuildSendTxInput parameter', async () => {
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
        purpose: 44,
        accountNumber: 0,
        isChange: false,
        index: 0
      }
      const txInput: BuildSendTxInput = {
        bip32Params,
        recipients: [
          {
            address: '1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM',
            value: 2000
          }
        ],
        wallet,
        fee: '100',
        opReturnData: 'nm, u?'
      }
      const { estimatedFees } = await btcChainAdapter.buildSendTransaction(txInput)
      expect(estimatedFees).toBeDefined()
    })
  })

  // describe('signTransaction', () => {
  //   it('should sign a properly formatted signTxInput object', async () => {
  //     const bip32Params: BIP32Params = {
  //       coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
  //       purpose: 44,
  //       accountNumber: 0,
  //       isChange: false,
  //       index: 0
  //     }
  //     const txInput = {
  //       bip32Params,
  //       recipients: [{ address: '1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM', value: 2000 }],
  //       wallet,
  //       fee: '100',
  //       opReturnData: 'sup fool'
  //     }

  //     const unsignedTx = await btcChainAdapter.buildSendTransaction(txInput)

  //     const signedTx = await btcChainAdapter.signTransaction({
  //       wallet,
  //       txToSign: unsignedTx?.txToSign
  //     })

  //     expect(true).toEqual('unimplemented')
  //   })
  // })

  // describe('broadcastTransaction', () => {
  //   it('is unimplemented', () => {
  //     expect(true).toEqual('unimplemented')
  //   })
  // })

  describe('getFeeData', () => {
    it('should return current BTC network fees', async () => {
      const data = await btcChainAdapter.getFeeData({})
      expect(data).toEqual(
        expect.objectContaining({
          fast: { minMinutes: 0, maxMinutes: 35, effort: 5, fee: expect.any(Number) },
          average: { minMinutes: 0, maxMinutes: 35, effort: 4, fee: expect.any(Number) },
          slow: { minMinutes: 0, maxMinutes: 50, effort: 3, fee: expect.any(Number) }
        })
      )
    })
  })

  describe('getAddress', () => {
    it("should return a p2pkh address for valid derivation root path parameters (m/44'/0'/0'/0/0)", async () => {
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const bip32Params: BIP32Params = {
        coinType: 0, // TODO(0xdef1cafe): i don't know what i'm doing here i'm trying to make it type check
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
      const referenceAddress = '1EjpFGTWJ9CGRJUMA3SdQSdigxM31aXAFx'
      const expectedReturnValue = { valid: true, result: 'valid' }
      const res = await btcChainAdapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const referenceAddress = ''
      const expectedReturnValue = { valid: false, result: 'invalid' }
      const res = await btcChainAdapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })
})
