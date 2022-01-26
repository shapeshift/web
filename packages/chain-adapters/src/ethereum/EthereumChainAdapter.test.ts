// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test EthereumChainAdapter
 * @group unit
 */
import { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { chainAdapters } from '@shapeshiftoss/types'

import * as ethereum from './EthereumChainAdapter'

const getGasFeesMockedResponse = {
  data: {
    gasPrice: '1',
    maxFeePerGas: '300',
    maxPriorityFeePerGas: '10'
  }
}

const estimateGasMockedResponse = { data: '21000' }

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const getWallet = async (): Promise<ETHWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test'
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

jest.mock('axios', () => ({
  get: jest.fn(() =>
    Promise.resolve({
      data: {
        result: [
          {
            source: 'MEDIAN',
            timestamp: 1639978534,
            instant: 55477500000,
            fast: 50180000000,
            standard: 45000000000,
            low: 41000000000
          }
        ]
      }
    })
  )
}))

describe('EthereumChainAdapter', () => {
  let args: ethereum.ChainAdapterArgs = {} as any

  beforeEach(() => {
    args = {
      providers: {
        http: {} as any,
        ws: {} as any
      }
    }
  })
  describe('getBalance', () => {
    it('is unimplemented', () => {
      expect(true).toBeTruthy()
    })
  })

  describe('getFeeData', () => {
    it('should return current ETH network fees', async () => {
      args.providers.http = {
        estimateGas: jest.fn().mockResolvedValue(estimateGasMockedResponse),
        getGasFees: jest.fn().mockResolvedValue(getGasFeesMockedResponse)
      } as any

      const adapter = new ethereum.ChainAdapter(args)

      const data = await adapter.getFeeData({
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: '0x0000000000000000000000000000000000000000',
          contractData: '0x'
        }
      })

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '50180000000',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10'
            },
            txFee: '1053780000000000'
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '55477500000',
              maxFeePerGas: '332',
              maxPriorityFeePerGas: '12'
            },
            txFee: '1165027500000000'
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '41000000000',
              maxFeePerGas: '246',
              maxPriorityFeePerGas: '9'
            },
            txFee: '861000000000000'
          }
        })
      )
    })
  })

  const validAddressTuple = {
    valid: true,
    result: chainAdapters.ValidAddressResultType.Valid
  }

  const invalidAddressTuple = {
    valid: false,
    result: chainAdapters.ValidAddressResultType.Invalid
  }

  describe('getAddress', () => {
    it('returns ETH address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const bip44Params = { purpose: 44, coinType: 60, accountNumber: 0 }
      const wallet = await getWallet()
      const res = await adapter.getAddress({ bip44Params, wallet })

      expect(res).toEqual('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8')
    })
  })

  describe('validateAddress', () => {
    it('should return true for a valid address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      const expectedReturnValue = validAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an empty address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'foobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })

  describe('validateEnsAddress', () => {
    it('should return true for a valid .eth address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'vitalik.eth'
      const expectedReturnValue = validAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an empty address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'foobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for a valid address directly followed by more chars', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'vitalik.ethfoobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for a valid address in the middle of a string', async () => {
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'asdadfvitalik.ethasdadf'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })
})
