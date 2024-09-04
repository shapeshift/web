import { arbitrumAssetId, arbitrumChainId, ASSET_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import type { ETHSignMessage, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { NativeAdapterArgs } from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import type { BIP44Params, EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { merge } from 'lodash'
import { toHex } from 'viem'
import { describe, expect, it, vi } from 'vitest'

import type { BuildSendTxInput, GetFeeDataInput, SignMessageInput, SignTxInput } from '../../types'
import { ValidAddressResultType } from '../../types'
import { toAddressNList } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import * as arbitrum from './ArbitrumChainAdapter'

vi.mock('../../utils/validateAddress', () => ({
  assertAddressNotSanctioned: vi.fn(),
}))

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EOA_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

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
const contractAddress = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
const value = 400

const makeChainSpecific = (chainSpecificAdditionalProps?: { contractAddress: string }) =>
  merge({ gasPrice, gasLimit }, chainSpecificAdditionalProps)

const makeGetGasFeesMockedResponse = (overrideArgs?: {
  slow: { gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }
  average: { gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }
  fast: { gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }
}) =>
  merge(
    {
      slow: { gasPrice: '4', maxFeePerGas: '240', maxPriorityFeePerGas: '8' },
      average: { gasPrice: '5', maxFeePerGas: '300', maxPriorityFeePerGas: '10' },
      fast: { gasPrice: '6', maxFeePerGas: '360', maxPriorityFeePerGas: '12' },
    },
    overrideArgs,
  )

const makeEstimateGasMockedResponse = (overrideArgs?: { gasLimit?: string }) =>
  merge({ gasLimit: '21000' }, overrideArgs)

const makeGetAccountMockResponse = (balance: {
  balance: string
  tokenBalance: string | undefined
}) => ({
  balance: balance.balance,
  unconfirmedBalance: '0',
  nonce: 2,
  tokens: [
    {
      assetId: `eip155:42161/erc20:${contractAddress}`,
      balance: balance.tokenBalance,
      type: 'ERC20',
      contract: contractAddress,
    },
  ],
})

const makeChainAdapterArgs = (overrideArgs?: {
  providers?: { http: unchained.arbitrum.V1Api }
  chainId?: EvmChainId
}): ChainAdapterArgs<unchained.arbitrum.V1Api> =>
  merge(
    {
      providers: {
        http: {} as unchained.arbitrum.V1Api,
        ws: {} as unchained.ws.Client<unchained.arbitrum.Tx>,
      },
      rpcUrl: '',
    },
    overrideArgs,
  )

describe('ArbitrumChainAdapter', () => {
  describe('constructor', () => {
    it('should return chainAdapter with mainnet chainId if called with no chainId', () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      expect(adapter.getChainId()).toEqual(arbitrumChainId)
    })

    it('should return chainAdapter with valid chainId if called with valid chainId', () => {
      const args = makeChainAdapterArgs({ chainId: KnownChainIds.ArbitrumMainnet })
      const adapter = new arbitrum.ChainAdapter(args)
      expect(adapter.getChainId()).toEqual(arbitrumChainId)
    })
  })

  describe('getFeeAssetId', () => {
    it('should return the correct fee assetId', () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      expect(adapter.getFeeAssetId()).toEqual(arbitrumAssetId)
    })
  })

  describe('getFeeData', () => {
    it('should return current network fees', async () => {
      const httpProvider = {
        estimateGas: vi.fn().mockResolvedValue(makeEstimateGasMockedResponse()),
        getGasFees: vi.fn().mockResolvedValue(makeGetGasFeesMockedResponse()),
      } as unknown as unchained.arbitrum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
        to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
        value: '123',
        chainSpecific: {
          from: ZERO_ADDRESS,
          data: '0x',
        },
      }
      const data = await adapter.getFeeData(getFeeDataInput)

      expect(data).toEqual(
        expect.objectContaining({
          average: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '5',
              maxFeePerGas: '300',
              maxPriorityFeePerGas: '10',
            },
            txFee: '6300000',
          },
          fast: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '6',
              maxFeePerGas: '360',
              maxPriorityFeePerGas: '12',
            },
            txFee: '7560000',
          },
          slow: {
            chainSpecific: {
              gasLimit: '21000',
              gasPrice: '4',
              maxFeePerGas: '240',
              maxPriorityFeePerGas: '8',
            },
            txFee: '5040000',
          },
        }),
      )
    })
  })

  describe('getGasFeeData', () => {
    it('should return current network gas fees', async () => {
      const httpProvider = {
        getGasFees: vi.fn().mockResolvedValue(makeGetGasFeesMockedResponse()),
      } as unknown as unchained.arbitrum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

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

  describe('getAddress', () => {
    const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
    const accountNumber = 0
    const fn = vi.fn()

    it('should return a valid address', async () => {
      const wallet = await getWallet()
      const res = await adapter.getAddress({
        accountNumber,
        wallet,
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      })

      expect(res).toEqual('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8')
    })

    it('should not show address on device by default', async () => {
      const wallet = await getWallet()
      wallet.ethGetAddress = fn.mockResolvedValueOnce('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8')

      await adapter.getAddress({
        accountNumber,
        wallet,
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      })

      expect(wallet.ethGetAddress).toHaveBeenCalledWith({
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        showDisplay: false,
      })
    })
  })

  describe('validateAddress', () => {
    const validAddressTuple = { valid: true, result: ValidAddressResultType.Valid }
    const invalidAddressTuple = { valid: false, result: ValidAddressResultType.Invalid }

    it('should return true for a valid address', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8')

      expect(res).toMatchObject(validAddressTuple)
    })

    it('should return false for an empty address', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('')

      expect(res).toMatchObject(invalidAddressTuple)
    })

    it('should return false for an invalid address', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const res = await adapter.validateAddress('foobar')

      expect(res).toMatchObject(invalidAddressTuple)
    })
  })

  describe('signTransaction', () => {
    it('should sign a properly formatted txToSign object', async () => {
      const balance = '2500000'
      const httpProvider = {
        getAccount: vi
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, tokenBalance: '424242' })),
      } as unknown as unchained.arbitrum.V1Api
      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const input = {
        wallet: await getWallet(),
        txToSign: {
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
          value: '0xf0',
          to: EOA_ADDRESS,
          chainId: Number(fromChainId(arbitrumChainId).chainReference),
          data: '0x',
          nonce: '0x0',
          gasPrice: '0x12a05f200',
          gasLimit: '0x5208',
        },
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as SignTxInput<ETHSignTx>

      await expect(adapter.signTransaction(input)).resolves.toEqual(
        '0xf8688085012a05f20082520894d8da6bf26964af9d7eed9e03e53415d37aa9604581f08083014986a03da7ef162db219372d35641028fb5f7ee126e5b41ac1b15483436835bdd5e035a03e59a740ed391048fde0b8c3975c226d123c394bf9e7215a3d609dc1582ee89c',
      )
    })

    it('should throw on txToSign with invalid data', async () => {
      const balance = '2500000'
      const httpProvider = {
        getAccount: vi
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance, tokenBalance: '424242' })),
      } as unknown as unchained.arbitrum.V1Api
      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const input = {
        wallet: await getWallet(),
        txToSign: {
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
          value: '0x0',
          to: EOA_ADDRESS,
          chainId: Number(fromChainId(arbitrumChainId).chainReference),
          data: 'notHexString',
          nonce: '0x0',
          gasPrice: '0x29d41057e0',
          gasLimit: '0xc9df',
        },
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as SignTxInput<ETHSignTx>

      await expect(adapter.signTransaction(input)).rejects.toThrow(/invalid hexlify value/)
    })
  })

  describe('signAndBroadcastTransaction', () => {
    it('should throw if no hash is returned by wallet.ethSendTx', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSendTx = async () => await Promise.resolve(null)

      const signTxInput = { wallet, txToSign: {} } as unknown as SignTxInput<ETHSignTx>

      await expect(
        adapter.signAndBroadcastTransaction({
          senderAddress: '0x1234',
          receiverAddress: '0x1234',
          signTxInput,
        }),
      ).rejects.toThrow(/Error signing & broadcasting tx/)
    })

    it('should return the hash returned by wallet.ethSendTx', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSendTx = async () =>
        await Promise.resolve({
          hash: '0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331',
        })

      const signTxInput = { wallet, txToSign: {} } as unknown as SignTxInput<ETHSignTx>

      await expect(
        adapter.signAndBroadcastTransaction({
          senderAddress: '0x1234',
          receiverAddress: '0x1234',
          signTxInput,
        }),
      ).resolves.toEqual('0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331')
    })
  })

  describe('signMessage', () => {
    it('should sign a properly formatted signMessageInput object', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      const message: SignMessageInput<ETHSignMessage> = {
        wallet,
        messageToSign: {
          message: 'Hello world 111',
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
        },
        checkLedgerAppOpenIfLedgerConnected: vi.fn(),
      }

      await expect(adapter.signMessage(message)).resolves.toEqual(
        '0x05a0edb4b98fe6b6ed270bf55aef84ddcb641512e19e340bf9eed3427854a7a4734fe45551dc24f1843cf2c823a73aa2454e3785eb15120573c522cc114e472d1c',
      )
    })

    it('should throw if wallet.ethSignMessage returns null', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())
      const wallet = await getWallet()

      wallet.ethSignMessage = async () => await Promise.resolve(null)

      const message: SignMessageInput<ETHSignMessage> = {
        wallet,
        messageToSign: {
          message: 'Hello world 111',
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
        },
        checkLedgerAppOpenIfLedgerConnected: vi.fn(),
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
        sendTx: vi.fn().mockResolvedValue(expectedResult),
      } as unknown as unchained.arbitrum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const mockTx = '0x123'
      const result = await adapter.broadcastTransaction({
        senderAddress: '0x1234',
        receiverAddress: '0x1234',
        hex: mockTx,
      })

      expect(args.providers.http.sendTx).toHaveBeenCalledWith<any>({ sendTxBody: { hex: mockTx } })
      expect(result).toEqual(expectedResult)
    })
  })

  describe('buildSendTransaction', () => {
    const accountNumber = 0

    it('should throw if passed tx has no "to" property', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())

      const input = {
        wallet: await getWallet(),
        accountNumber,
        value,
        chainSpecific: makeChainSpecific({ contractAddress }),
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as BuildSendTxInput<KnownChainIds.ArbitrumMainnet>

      await expect(adapter.buildSendTransaction(input)).rejects.toThrow(
        `${adapter.getName()}ChainAdapter: to is required`,
      )
    })

    it('should throw if passed tx has no "value" property', async () => {
      const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())

      const input = {
        wallet: await getWallet(),
        accountNumber,
        to: EOA_ADDRESS,
        chainSpecific: makeChainSpecific(),
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as BuildSendTxInput<KnownChainIds.ArbitrumMainnet>

      await expect(adapter.buildSendTransaction(input)).rejects.toThrow(
        `${adapter.getName()}ChainAdapter: value is required`,
      )
    })

    it('should return a validly formatted ETHSignTx object for a valid BuildSendTxInput parameter', async () => {
      const httpProvider = {
        getAccount: vi
          .fn<any, any>()
          .mockResolvedValue(makeGetAccountMockResponse({ balance: '0', tokenBalance: '424242' })),
      } as unknown as unchained.arbitrum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const wallet = await getWallet()
      wallet.ethGetAddress = async () => await Promise.resolve(ZERO_ADDRESS)

      const input = {
        wallet,
        accountNumber,
        to: EOA_ADDRESS,
        value,
        chainSpecific: makeChainSpecific(),
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as BuildSendTxInput<KnownChainIds.ArbitrumMainnet>

      await expect(adapter.buildSendTransaction(input)).resolves.toStrictEqual({
        txToSign: {
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
          chainId: Number(fromChainId(arbitrumChainId).chainReference),
          data: '',
          gasLimit: toHex(BigInt(gasLimit)),
          gasPrice: toHex(BigInt(gasPrice)),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: toHex(BigInt(value)),
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })

    it("should build a tx with value: '0' for BEP20 txs without sendMax", async () => {
      const httpProvider = {
        getAccount: vi
          .fn<any, any>()
          .mockResolvedValue(
            makeGetAccountMockResponse({ balance: '2500000', tokenBalance: '424242' }),
          ),
      } as unknown as unchained.arbitrum.V1Api

      const args = makeChainAdapterArgs({ providers: { http: httpProvider } })
      const adapter = new arbitrum.ChainAdapter(args)

      const input = {
        wallet: await getWallet(),
        accountNumber,
        to: ZERO_ADDRESS,
        value,
        chainSpecific: makeChainSpecific({ contractAddress }),
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      } as unknown as BuildSendTxInput<KnownChainIds.ArbitrumMainnet>

      await expect(adapter.buildSendTransaction(input)).resolves.toStrictEqual({
        txToSign: {
          addressNList: toAddressNList(adapter.getBIP44Params({ accountNumber: 0 })),
          chainId: Number(fromChainId(arbitrumChainId).chainReference),
          data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000190',
          gasLimit: toHex(BigInt(gasLimit)),
          gasPrice: toHex(BigInt(gasPrice)),
          nonce: '0x2',
          to: contractAddress,
          value: '0x0',
        },
      })

      expect(args.providers.http.getAccount).toHaveBeenCalledTimes(1)
    })
  })

  describe('getBIP44Params', () => {
    const adapter = new arbitrum.ChainAdapter(makeChainAdapterArgs())

    it('should return the correct coinType', () => {
      const result = adapter.getBIP44Params({ accountNumber: 0 })
      expect(result.coinType).toStrictEqual(Number(ASSET_REFERENCE.Arbitrum))
    })

    it('should respect accountNumber', () => {
      const testCases: BIP44Params[] = [
        { purpose: 44, coinType: Number(ASSET_REFERENCE.Arbitrum), accountNumber: 0 },
        { purpose: 44, coinType: Number(ASSET_REFERENCE.Arbitrum), accountNumber: 1 },
        { purpose: 44, coinType: Number(ASSET_REFERENCE.Arbitrum), accountNumber: 2 },
      ]

      testCases.forEach(expected => {
        const result = adapter.getBIP44Params({ accountNumber: expected.accountNumber })
        expect(result).toStrictEqual(expected)
      })
    })

    it('should throw for negative accountNumber', () => {
      expect(() => {
        adapter.getBIP44Params({ accountNumber: -1 })
      }).toThrow('accountNumber must be >= 0')
    })
  })
})
