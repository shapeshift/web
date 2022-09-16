// Allow explicit any since this is a test file
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test AvalancheChainAdapter
 * @group unit
 */
import { avalancheAssetId } from '@shapeshiftoss/caip'
import { ETHSignMessage, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import unchained from '@shapeshiftoss/unchained-client'
import { merge } from 'lodash'
import { numberToHex } from 'web3-utils'

import {
  BuildSendTxInput,
  SignMessageInput,
  SignTxInput,
  ValidAddressResultType,
} from '../../types'
import { bn } from '../../utils/bignumber'
import { ChainAdapterArgs, EvmChainId } from '../EvmBaseAdapter'
import * as avalanche from './AvalancheChainAdapter'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EOA_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const VALID_CHAIN_ID = 'eip155:43114'

const testMnemonic = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const getWallet = async (): Promise<ETHWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: testMnemonic,
    deviceId: 'test',
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const gasPrice = '42'
const gasLimit = '42000'
const erc20ContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
const value = 400

const makeChainSpecific = (chainSpecificAdditionalProps?: { erc20ContractAddress: string }) =>
  merge({ gasPrice, gasLimit }, chainSpecificAdditionalProps)

const makeGetGasFeesMockedResponse = (overrideArgs?: {
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}) => merge({ gasPrice: '5', maxFeePerGas: '300', maxPriorityFeePerGas: '10' }, overrideArgs)

const makeEstimateGasMockedResponse = (overrideArgs?: string) => overrideArgs ?? '21000'

const makeGetAccountMockResponse = (balance: {
  balance: string
  erc20Balance: string | undefined
}) => ({
  balance: balance.balance,
  unconfirmedBalance: '0',
  nonce: 2,
  tokens: [
    {
      assetId: 'eip155:43114/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
      balance: balance.erc20Balance,
      type: 'ERC20',
      contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    },
  ],
})

const makeChainAdapterArgs = (overrideArgs?: {
  providers?: { http: unchained.avalanche.V1Api }
  chainId?: EvmChainId
}): ChainAdapterArgs =>
  merge(
    {
      providers: {
        http: {} as unchained.avalanche.V1Api,
        ws: {} as unchained.ws.Client<unchained.avalanche.Tx>,
      },
      rpcUrl: '',
    },
    overrideArgs,
  )

describe('AvalancheChainAdapter', () => {
  describe('constructor', () => {
    it('should return chainAdapter with Avalanche mainnet chainId if called with no chainId', () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      expect(adapter.getChainId()).toEqual(VALID_CHAIN_ID)
    })

    it('should return chainAdapter with valid chainId if called with valid chainId', () => {
      const args = makeChainAdapterArgs({ chainId: KnownChainIds.AvalancheMainnet })
      const adapter = new avalanche.ChainAdapter(args)
      expect(adapter.getChainId()).toEqual(VALID_CHAIN_ID)
    })
  })

  describe('getFeeAssetId', () => {
    it('should return the correct fee assetId', () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      expect(adapter.getFeeAssetId()).toEqual(avalancheAssetId)
    })
  })

  describe('getFeeData', () => {
    it('should return current AVAX network fees', async () => {
      const httpProvider = {
        estimateGas: jest.fn().mockResolvedValue(makeEstimateGasMockedResponse()),
        getGasFees: jest.fn().mockResolvedValue(makeGetGasFeesMockedResponse()),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const data = await adapter.getFeeData({
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: ZERO_ADDRESS,
          contractData: '0x',
        },
      })

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '5',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10',
            },
            txFee: '105000',
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '6',
              maxFeePerGas: '360',
              maxPriorityFeePerGas: '12',
            },
            txFee: '126000',
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '4',
              maxFeePerGas: '240',
              maxPriorityFeePerGas: '8',
            },
            txFee: '84000',
          },
        }),
      )
    })
  })

  describe('getGasFeeData', () => {
    it('should return current AVAX network gas fees', async () => {
      const httpProvider = {
        getGasFees: jest.fn().mockResolvedValue(makeGetGasFeesMockedResponse()),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const data = await adapter.getGasFeeData()

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            gasPrice: '5',
            maxFeePerGas: '300',
            maxPriorityFeePerGas: '10',
          },
          fast: {
            gasPrice: '6',
            maxFeePerGas: '360',
            maxPriorityFeePerGas: '12',
          },
          slow: {
            gasPrice: '4',
            maxFeePerGas: '240',
            maxPriorityFeePerGas: '8',
          },
        }),
      )
    })
  })

  describe('validateAddress', () => {
    const validAddressTuple = {
      valid: true,
      result: ValidAddressResultType.Valid,
    }

    const invalidAddressTuple = {
      valid: false,
      result: ValidAddressResultType.Invalid,
    }

    it('should return true for a valid address', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')

      expect(res).toMatchObject(validAddressTuple)
    })

    it('should return false for an empty address', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('')

      expect(res).toMatchObject(invalidAddressTuple)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('foobar')

      expect(res).toMatchObject(invalidAddressTuple)
    })
  })

  describe('signAndBroadcastTransaction', () => {
    it('should throw if no hash is returned by wallet.ethSendTx', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSendTx = async () => null

      const tx = { wallet, txToSign: {} } as unknown as SignTxInput<ETHSignTx>

      await expect(adapter.signAndBroadcastTransaction(tx)).rejects.toThrow(
        /Error signing & broadcasting tx/,
      )
    })

    it('should return the hash returned by wallet.ethSendTx', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSendTx = async () => ({
        hash: '0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331',
      })

      const tx = { wallet, txToSign: {} } as unknown as SignTxInput<ETHSignTx>

      await expect(adapter.signAndBroadcastTransaction(tx)).resolves.toEqual(
        '0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331',
      )
    })
  })

  describe('signMessage', () => {
    it('should sign a properly formatted signMessageInput object', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      const message: SignMessageInput<ETHSignMessage> = {
        wallet,
        messageToSign: {
          message: 'Hello world 111',
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
        },
      }

      await expect(adapter.signMessage(message)).resolves.toEqual(
        '0x05a0edb4b98fe6b6ed270bf55aef84ddcb641512e19e340bf9eed3427854a7a4734fe45551dc24f1843cf2c823a73aa2454e3785eb15120573c522cc114e472d1c',
      )
    })

    it('should throw if wallet.ethSignMessage returns null', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSignMessage = async () => null

      const message: SignMessageInput<ETHSignMessage> = {
        wallet,
        messageToSign: {
          message: 'Hello world 111',
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
        },
      }

      await expect(adapter.signMessage(message)).rejects.toThrow(
        /EvmBaseAdapter: error signing message/,
      )
    })
  })

  describe('broadcastTransaction', () => {
    it('should correctly call sendTx and return its response', async () => {
      const expectedResult = 'success'

      const httpProvider = {
        sendTx: jest.fn().mockResolvedValue(expectedResult),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction(mockTx)

      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(expectedResult)
    })
  })

  describe('buildSendTransaction', () => {
    it('should throw if passed tx has no "to" property', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())

      const tx = {
        wallet: await getWallet(),
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'AvalancheChainAdapter: to is required',
      )
    })

    it('should throw if passed tx has no "value" property', async () => {
      const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())

      const tx = {
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        chainSpecific: makeChainSpecific(),
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow(
        'AvalancheChainAdapter: value is required',
      )
    })

    it('should return a validly formatted ETHSignTx object for a valid BuildSendTxInput parameter', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance: '0', erc20Balance: '424242' })),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
          chainId: 43114,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: numberToHex(value),
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it('sendmax: true without chainSpecific.erc20ContractAddress should throw if AVAX balance is 0', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance: '0', erc20Balance: '424242' })),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
        sendMax: true,
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow('no balance')

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it('sendMax: true without chainSpecific.erc20ContractAddress - should build a tx with full account balance - gas fee', async () => {
      const balance = '2500000'
      const expectedValue = numberToHex(
        bn(balance).minus(bn(gasLimit).multipliedBy(gasPrice)) as any,
      )
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, erc20Balance: '424242' })),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
        sendMax: true,
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
          chainId: 43114,
          data: '',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: expectedValue,
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it("should build a tx with value: '0' for ERC20 txs without sendMax", async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: '424242' }),
          ),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: ZERO_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
          chainId: 43114,
          data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000190',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0',
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it('sendmax: true with chainSpecific.erc20ContractAddress should build a tx with full account balance - gas fee', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: '424242' }),
          ),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
        sendMax: true,
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).resolves.toStrictEqual({
        txToSign: {
          addressNList: [2147483692, 2147492648, 2147483648, 0, 0],
          chainId: 43114,
          data: '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000000000000067932',
          gasLimit: numberToHex(gasLimit),
          gasPrice: numberToHex(gasPrice),
          nonce: '0x2',
          to: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          value: '0x0',
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it('sendmax: true with chainSpecific.erc20ContractAddress should throw if token balance is 0', async () => {
      const httpProvider = {
        getAccount: jest
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', erc20Balance: undefined }),
          ),
      } as unknown as unchained.avalanche.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new avalanche.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => ZERO_ADDRESS

      const tx = {
        wallet,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ erc20ContractAddress }),
        sendMax: true,
      } as unknown as BuildSendTxInput<KnownChainIds.AvalancheMainnet>

      await expect(adapter.buildSendTransaction(tx)).rejects.toThrow('no balance')

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
  })
  describe('getBIP44Params', () => {
    const expectedCoinType = 9000
    const adapter = new avalanche.ChainAdapter(makeChainAdapterArgs())
    it('should be coinType 9000', async () => {
      const r = adapter.getBIP44Params({ accountNumber: 0 })
      expect(r.coinType).toStrictEqual(expectedCoinType)
    })
    it('should respect accountNumber', async () => {
      const expected: BIP44Params[] = [
        { purpose: 44, coinType: expectedCoinType, accountNumber: 0 },
        { purpose: 44, coinType: expectedCoinType, accountNumber: 1 },
        { purpose: 44, coinType: expectedCoinType, accountNumber: 2 },
      ]
      for (let accountNumber = 0; accountNumber < expected.length; accountNumber++) {
        const r = adapter.getBIP44Params({ accountNumber })
        expect(r).toStrictEqual(expected[accountNumber])
      }
    })
    it('should throw for negative accountNumber', async () => {
      expect(() => {
        adapter.getBIP44Params({ accountNumber: -1 })
      }).toThrow('accountNumber must be >= 0')
    })
  })
})
