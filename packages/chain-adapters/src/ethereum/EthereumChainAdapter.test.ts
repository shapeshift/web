// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test EthereumChainAdapter
 * @group unit
 */
import { ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import unchained from '@shapeshiftoss/unchained-client'
import { merge } from 'lodash'
import { numberToHex } from 'web3-utils'

import { bn } from '../utils/bignumber'
import * as ethereum from './EthereumChainAdapter'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EOA_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const ENS_NAME = 'vitalik.eth'
const VALID_CHAIN_ID = 'eip155:1'

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
  const gasPrice = '42'
  const gasLimit = '42000'
  const erc20ContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const value = 400

  const makeChainSpecific = (chainSpecificAdditionalProps?: { erc20ContractAddress: string }) =>
    merge(
      {
        gasPrice,
        gasLimit
      },
      chainSpecificAdditionalProps
    )

  const makeGetGasFeesMockedResponse = (overrideArgs?: {
    data: { gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }
  }) =>
    merge(
      {
        data: {
          gasPrice: '1',
          maxFeePerGas: '300',
          maxPriorityFeePerGas: '10'
        }
      },
      overrideArgs
    )

  const makeEstimateGasMockedResponse = (overrideArgs?: { data: string }) =>
    merge({ data: '21000' }, overrideArgs)

  const makeGetAccountMockResponse = (balance: {
    balance: string
    erc20Balance: string | undefined
  }) => ({
    data: {
      balance: balance.balance,
      unconfirmedBalance: '0',
      nonce: 2,
      tokens: [
        {
          assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          balance: balance.erc20Balance,
          type: 'ERC20',
          contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
        }
      ]
    }
  })

  const makeChainAdapterArgs = (overrideArgs?: {
    providers?: { http: unchained.ethereum.V1Api }
    chainId?: string
  }): ethereum.ChainAdapterArgs =>
    merge(
      {
        providers: {
          http: {} as unknown as unchained.ethereum.V1Api,
          ws: {} as unchained.ws.Client<unchained.ethereum.ParsedTx>
        }
      },
      overrideArgs
    )

  describe('constructor', () => {
    it('should return chainAdapter with Ethereum mainnet chainId if called with no chainId', () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const chainId = adapter.getChainId()
      expect(chainId).toEqual(VALID_CHAIN_ID)
    })
    it('should return chainAdapter with valid chainId if called with valid chainId', () => {
      const args = makeChainAdapterArgs({ chainId: 'eip155:3' })
      const adapter = new ethereum.ChainAdapter(args)
      const chainId = adapter.getChainId()
      expect(chainId).toEqual('eip155:3')
    })
    it('should throw if called with invalid chainId', () => {
      const args = makeChainAdapterArgs({ chainId: 'INVALID_CHAINID' })
      expect(() => new ethereum.ChainAdapter(args)).toThrow(/The ChainID (.+) is not supported/)
    })
  })

  describe('getBalance', () => {
    it('is unimplemented', () => {
      expect(true).toBeTruthy()
    })
  })

  describe('getFeeData', () => {
    it('should return current ETH network fees', async () => {
      const httpProvider = {
        estimateGas: jest.fn().mockResolvedValue(makeEstimateGasMockedResponse()),
        getGasFees: jest.fn().mockResolvedValue(makeGetGasFeesMockedResponse())
      } as unknown as unchained.ethereum.V1Api
      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })

      const adapter = new ethereum.ChainAdapter(args)

      const data = await adapter.getFeeData({
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: ZERO_ADDRESS,
          contractData: '0x'
        }
      })

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '45000000000',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10'
            },
            txFee: '945000000000000'
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '50180000000',
              maxFeePerGas: '335',
              maxPriorityFeePerGas: '12'
            },
            txFee: '1053780000000000'
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '41000000000',
              maxFeePerGas: '274',
              maxPriorityFeePerGas: '10'
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
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const bip44Params = { purpose: 44, coinType: 60, accountNumber: 0 }
      const wallet = await getWallet()
      const res = await adapter.getAddress({ bip44Params, wallet })

      expect(res).toEqual('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8')
    })
  })

  describe('validateAddress', () => {
    it('should return true for a valid address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      const expectedReturnValue = validAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an empty address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'foobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })

  describe('validateEnsAddress', () => {
    it('should return true for a valid .eth address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'vitalik.eth'
      const expectedReturnValue = validAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an empty address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = ''
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for an invalid address', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'foobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for a valid address directly followed by more chars', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'vitalik.ethfoobar'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })

    it('should return false for a valid address in the middle of a string', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const referenceAddress = 'asdadfvitalik.ethasdadf'
      const expectedReturnValue = invalidAddressTuple
      const res = await adapter.validateEnsAddress(referenceAddress)
      expect(res).toMatchObject(expectedReturnValue)
    })
  })

  describe('signTransaction', () => {
    it('should sign a properly formatted txToSign object', async () => {
      const balance = '2500000'
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, erc20Balance: '424242' }))
      } as unknown as unchained.ethereum.V1Api
      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          value: '0x0',
          to: EOA_ADDRESS,
          chainId: 1,
          data: '0x0000000000000000',
          nonce: '0x0',
          gasPrice: '0x29d41057e0',
          gasLimit: '0xc9df'
        }
      } as unknown as chainAdapters.SignTxInput<ETHSignTx>

      await expect(adapter.signTransaction(tx)).resolves.toEqual(
        '0xf86c808529d41057e082c9df94d8da6bf26964af9d7eed9e03e53415d37aa960458088000000000000000025a04db6f6d27b6e7de2a627d7a7a213915db14d0d811e97357f1b4e3b3b25584dfaa07e4e329f23f33e1b21b3f443a80fad3255b2c968820d02b57752b4c91a9345c5'
      )
    })
    it('should throw on txToSign with invalid data', async () => {
      const balance = '2500000'
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, erc20Balance: '424242' }))
      } as unknown as unchained.ethereum.V1Api
      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          value: '0x0',
          to: EOA_ADDRESS,
          chainId: 1,
          data: 'notHexString',
          nonce: '0x0',
          gasPrice: '0x29d41057e0',
          gasLimit: '0xc9df'
        }
      } as unknown as chainAdapters.SignTxInput<ETHSignTx>

      await expect(adapter.signTransaction(tx)).rejects.toThrow(/invalid hexlify value/)
    })
  })

  describe('signAndBroadcastTransaction', () => {
    it('should throw if no hash is returned by wallet.ethSendTx', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const wallet = await getWallet()
      wallet.ethSendTx = async () => null

      const tx = {
        wallet,
        txToSign: {}
      } as unknown as chainAdapters.SignTxInput<ETHSignTx>

      await expect(adapter.signAndBroadcastTransaction(tx)).rejects.toThrow(
        /Error signing & broadcasting tx/
      )
    })

    it('should return the hash returned by wallet.ethSendTx', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)
      const wallet = await getWallet()
      wallet.ethSendTx = async () => ({
        hash: '0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331'
      })

      const tx = {
        wallet,
        txToSign: {}
      } as unknown as chainAdapters.SignTxInput<ETHSignTx>

      await expect(adapter.signAndBroadcastTransaction(tx)).resolves.toEqual(
        '0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331'
      )
    })
  })

  describe('broadcastTransaction', () => {
    it('should correctly call sendTx and return its response', async () => {
      const expectedResult = 'success'

      const httpProvider = {
        sendTx: jest.fn().mockResolvedValue({ data: expectedResult })
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction(mockTx)

      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(expectedResult)
    })
  })

  describe('buildSendTransaction', () => {
    it('should throw if passed tx has no "to" property', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress })
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'EthereumChainAdapter: to is required'
      )
    })

    it('should throw if passed tx has ENS as "to" property', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: '424242' })
          )
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: ENS_NAME,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress })
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        /a provider or signer is needed to resolve ENS names/
      )
    })

    it('should throw if passed tx has no "value" property', async () => {
      const args = makeChainAdapterArgs()
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        chainSpecific: makeChainSpecific()
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'EthereumChainAdapter: value is required'
      )
    })

    it('should return a validly formatted ETHSignTx object for a valid BuildSendTxInput parameter', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance: '0', erc20Balance: '424242' }))
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific()
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: numberToHex(value)
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
    it('sendmax: true without chainSpecific.erc20ContractAddress should throw if ETH balance is 0', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance: '0', erc20Balance: '424242' }))
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
        sendMax: true
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow('no balance')
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })
    it('sendMax: true without chainSpecific.erc20ContractAddress - should build a tx with full account balance - gas fee', async () => {
      const balance = '2500000'
      const expectedValue = numberToHex(
        bn(balance).minus(bn(gasLimit).multipliedBy(gasPrice)) as any
      )
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, erc20Balance: '424242' }))
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
        sendMax: true
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: expectedValue
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })
    it("should build a tx with value: '0' for ERC20 txs without sendMax", async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: '424242' })
          )
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: ZERO_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress })
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000190',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0'
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
    it('sendmax: true with chainSpecific.erc20ContractAddress should build a tx with full account balance - gas fee', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: '424242' })
          )
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
        sendMax: true
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          chainId: 1,
          data: '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000000000000067932',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0'
        }
      })
      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })

    it('sendmax: true with chainSpecific.erc20ContractAddress should throw if token balance is 0', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: undefined })
          )
      } as unknown as unchained.ethereum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new ethereum.ChainAdapter(args)

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
        sendMax: true
      } as unknown as chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow('no balance')

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(2)
    })
  })
})
