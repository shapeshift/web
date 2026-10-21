import type { AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  arbitrumChainId,
  ASSET_REFERENCE,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  bscAssetId,
  bscChainId,
  CHAIN_REFERENCE,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  optimismAssetId,
  optimismChainId,
  polygonAssetId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import type { ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { toHex } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BuildSendTxInput, GetFeeDataInput, SignTxInput } from '../types'
import { ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'
import * as arbitrum from './arbitrum'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bsc from './bnbsmartchain'
import * as ethereum from './ethereum'
import { EvmBaseAdapter } from './EvmBaseAdapter'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import * as polygon from './polygon'

const { sendRawTransaction } = vi.hoisted(() => ({ sendRawTransaction: vi.fn() }))

vi.mock('@shapeshiftoss/contracts', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual: typeof import('@shapeshiftoss/contracts') = await importOriginal()
  return {
    ...actual,
    viemClientByChainId: { 'eip155:1': { sendRawTransaction } },
  }
})

vi.mock('../utils/validateAddress', () => ({
  assertAddressNotSanctioned: vi.fn(),
}))

class TestEvmAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  constructor(http: Partial<unchained.evm.Api> = {}) {
    super({
      assetId: ethAssetId,
      chainId: KnownChainIds.EthereumMainnet,
      rootBip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
      supportedChainIds: [KnownChainIds.EthereumMainnet],
      parser: {} as unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>,
      providers: {
        http: http as unchained.evm.Api,
        ws: {} as unchained.ws.Client<unchained.evm.types.Tx>,
      },
      rpcUrl: '',
    })
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return ethAssetId
  }

  getName(): string {
    return 'Test'
  }

  getDisplayName(): string {
    return 'Test'
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EOA_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const WALLET_ADDRESS = '0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8'
const TOKEN_ADDRESS = '0xc770eefad204b5180df6a14ee197d99d808ee52d'

const getWallet = async (): Promise<ETHWallet> => {
  const wallet = new NativeHDWallet({
    mnemonic: 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle',
    deviceId: 'test',
  })
  await wallet.initialize()
  return wallet
}

const input: GetFeeDataInput<KnownChainIds.EthereumMainnet> = {
  to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
  value: '123',
  chainSpecific: { from: ZERO_ADDRESS, data: '0x' },
}

const eip1559GasFees = {
  slow: { gasPrice: '4', maxFeePerGas: '240', maxPriorityFeePerGas: '8' },
  average: { gasPrice: '5', maxFeePerGas: '300', maxPriorityFeePerGas: '10' },
  fast: { gasPrice: '6', maxFeePerGas: '360', maxPriorityFeePerGas: '12' },
}

describe('EvmBaseAdapter', () => {
  beforeEach(() => {
    vi.spyOn(EvmBaseAdapter.prototype, 'getNonce').mockResolvedValue(2)
  })

  describe('getFeeData', () => {
    it('prices each speed at its max fee per gas times the estimated gas limit', async () => {
      const adapter = new TestEvmAdapter({
        estimateGas: vi.fn().mockResolvedValue({ gasLimit: '21000' }),
        getGasFees: vi.fn().mockResolvedValue(eip1559GasFees),
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.slow.txFee).toBe('5040000')
      expect(feeData.average.txFee).toBe('6300000')
      expect(feeData.fast.txFee).toBe('7560000')
      expect(feeData.average.chainSpecific).toEqual({
        gasLimit: '21000',
        ...eip1559GasFees.average,
      })
    })

    it('prices legacy gas at the gas price', async () => {
      const legacy = { gasPrice: '5' }
      const adapter = new TestEvmAdapter({
        estimateGas: vi.fn().mockResolvedValue({ gasLimit: '21000' }),
        getGasFees: vi.fn().mockResolvedValue({ slow: legacy, average: legacy, fast: legacy }),
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.average.txFee).toBe('105000')
    })

    it('adds the l1 fee when the estimate carries an l1 gas limit', async () => {
      const adapter = new TestEvmAdapter()
      const gasFees = { ...eip1559GasFees.average, l1GasPrice: '3' }
      vi.spyOn(adapter, 'getGasLimit').mockResolvedValue({ gasLimit: '21000', l1GasLimit: '1000' })
      vi.spyOn(adapter, 'getGasFeeData').mockResolvedValue({
        slow: gasFees,
        average: gasFees,
        fast: gasFees,
      })

      const feeData = await adapter.getFeeData(input)

      expect(feeData.average.txFee).toBe('6303000')
      expect(feeData.average.chainSpecific).toEqual(
        expect.objectContaining({ gasLimit: '21000', l1GasLimit: '1000', l1GasPrice: '3' }),
      )
    })

    it('surfaces a failed gas estimate', async () => {
      const adapter = new TestEvmAdapter({
        getGasFees: vi.fn().mockResolvedValue(eip1559GasFees),
      })
      vi.spyOn(adapter, 'getGasLimit').mockRejectedValue(new Error('execution reverted'))

      await expect(adapter.getFeeData(input)).rejects.toThrow('execution reverted')
    })
  })

  describe('getAddress', () => {
    it('derives the account address without showing it on device', async () => {
      const adapter = new TestEvmAdapter()
      const wallet = await getWallet()
      const ethGetAddress = vi.spyOn(wallet, 'ethGetAddress')

      await expect(adapter.getAddress({ accountNumber: 0, wallet })).resolves.toEqual(
        WALLET_ADDRESS,
      )
      expect(ethGetAddress).toHaveBeenCalledWith({
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
        showDisplay: false,
      })
    })
  })

  describe('validateAddress', () => {
    const adapter = new TestEvmAdapter()

    it.each([EOA_ADDRESS, EOA_ADDRESS.toLowerCase()])('accepts %s', async address => {
      await expect(adapter.validateAddress(address)).resolves.toMatchObject({
        valid: true,
        result: ValidAddressResultType.Valid,
      })
    })

    it.each(['', 'foobar'])('rejects %j', async address => {
      await expect(adapter.validateAddress(address)).resolves.toMatchObject({
        valid: false,
        result: ValidAddressResultType.Invalid,
      })
    })
  })

  describe('getBip44Params', () => {
    const adapter = new TestEvmAdapter()

    it('uses the account number in the derivation path', () => {
      ;[0, 1, 2].forEach(accountNumber => {
        expect(adapter.getBip44Params({ accountNumber })).toStrictEqual({
          purpose: 44,
          coinType: 60,
          accountNumber,
          isChange: false,
          addressIndex: 0,
        })
      })
    })

    it('throws for a negative account number', () => {
      expect(() => adapter.getBip44Params({ accountNumber: -1 })).toThrow(
        'accountNumber must be >= 0',
      )
    })
  })

  describe('buildSendTransaction', () => {
    const gasPrice = '42'
    const gasLimit = '42000'
    const value = '400'

    const buildSend = async (overrides: Record<string, unknown>) => {
      const http = { getAccount: vi.fn() }
      const adapter = new TestEvmAdapter(http as unknown as unchained.evm.Api)
      const tx = {
        accountNumber: 0,
        wallet: await getWallet(),
        to: EOA_ADDRESS,
        value,
        chainSpecific: { gasPrice, gasLimit },
        ...overrides,
      } as unknown as BuildSendTxInput<KnownChainIds.EthereumMainnet>
      return { adapter, http, result: adapter.buildSendTransaction(tx) }
    }

    it('builds a native send with the nonce and never fetches the account', async () => {
      const { adapter, http, result } = await buildSend({})

      await expect(result).resolves.toStrictEqual({
        txToSign: {
          addressNList: toAddressNList(adapter.getBip44Params({ accountNumber: 0 })),
          chainId: Number(CHAIN_REFERENCE.EthereumMainnet),
          data: '0x',
          gasLimit: toHex(BigInt(gasLimit)),
          gasPrice: toHex(BigInt(gasPrice)),
          nonce: '0x2',
          to: EOA_ADDRESS,
          value: toHex(BigInt(value)),
        },
      })
      expect(adapter.getNonce).toHaveBeenCalledWith(WALLET_ADDRESS)
      expect(http.getAccount).not.toHaveBeenCalled()
    })

    it('builds an erc20 send to the token contract with zero value', async () => {
      const { result } = await buildSend({
        to: ZERO_ADDRESS,
        chainSpecific: { gasPrice, gasLimit, contractAddress: TOKEN_ADDRESS },
      })

      await expect(result).resolves.toMatchObject({
        txToSign: {
          data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000190',
          to: TOKEN_ADDRESS,
          value: '0x0',
        },
      })
    })

    it('uses a custom nonce instead of fetching one', async () => {
      const { adapter, result } = await buildSend({ customNonce: '7' })

      await expect(result).resolves.toMatchObject({ txToSign: { nonce: '0x7' } })
      expect(adapter.getNonce).not.toHaveBeenCalled()
    })

    it('fetches the nonce when the custom nonce is empty', async () => {
      const { result } = await buildSend({ customNonce: '' })

      await expect(result).resolves.toMatchObject({ txToSign: { nonce: '0x2' } })
    })

    it.each([
      ['to is required', { to: undefined }],
      ['value is required', { value: undefined }],
      [
        /Address .+ is invalid/,
        {
          to: 'vitalik.eth',
          chainSpecific: { gasPrice, gasLimit, contractAddress: TOKEN_ADDRESS },
        },
      ],
    ])('throws %s', async (error, overrides) => {
      const { result } = await buildSend(overrides)
      await expect(result).rejects.toThrow(error)
    })
  })

  describe('buildCustomTx', () => {
    const txArgs = {
      accountNumber: 0,
      to: '0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F',
      data: '0x420',
      value: '123',
      gasLimit: '456',
      networkFeeCryptoBaseUnit: '424242424242',
    }

    it.each([
      ['legacy', { gasPrice: '123' }, { gasPrice: '0x7b' }],
      [
        'eip1559',
        { maxFeePerGas: '421', maxPriorityFeePerGas: '422' },
        { maxFeePerGas: '0x1a5', maxPriorityFeePerGas: '0x1a6' },
      ],
    ])('builds a %s custom tx with the nonce', async (_, fees, expectedFees) => {
      const adapter = new TestEvmAdapter()

      await expect(
        adapter.buildCustomTx({ wallet: await getWallet(), ...txArgs, ...fees }),
      ).resolves.toEqual({
        txToSign: {
          addressNList: toAddressNList(adapter.getBip44Params({ accountNumber: 0 })),
          value: '0x7b',
          to: txArgs.to,
          chainId: Number(CHAIN_REFERENCE.EthereumMainnet),
          data: '0x420',
          nonce: '0x2',
          gasLimit: '0x1c8',
          ...expectedFees,
        },
      })
    })
  })

  describe('signTransaction', () => {
    const txToSign = {
      value: '0x0',
      to: EOA_ADDRESS,
      chainId: Number(CHAIN_REFERENCE.EthereumMainnet),
      nonce: '0x0',
      gasPrice: '0x29d41057e0',
      gasLimit: '0xc9df',
    }

    it('signs a tx', async () => {
      const adapter = new TestEvmAdapter()
      const addressNList = toAddressNList(adapter.getBip44Params({ accountNumber: 0 }))

      await expect(
        adapter.signTransaction({
          wallet: await getWallet(),
          txToSign: { ...txToSign, addressNList, data: '0x0000000000000000' },
        } as unknown as SignTxInput<ETHSignTx>),
      ).resolves.toEqual(
        '0xf86c808529d41057e082c9df94d8da6bf26964af9d7eed9e03e53415d37aa960458088000000000000000025a04db6f6d27b6e7de2a627d7a7a213915db14d0d811e97357f1b4e3b3b25584dfaa07e4e329f23f33e1b21b3f443a80fad3255b2c968820d02b57752b4c91a9345c5',
      )
    })

    it('throws on invalid data', async () => {
      const adapter = new TestEvmAdapter()
      const addressNList = toAddressNList(adapter.getBip44Params({ accountNumber: 0 }))

      await expect(
        adapter.signTransaction({
          wallet: await getWallet(),
          txToSign: { ...txToSign, addressNList, data: 'notHexString' },
        } as unknown as SignTxInput<ETHSignTx>),
      ).rejects.toThrow(/invalid hexlify value/)
    })
  })

  describe('signAndBroadcastTransaction', () => {
    const signAndBroadcast = async (hash: string | null) => {
      const adapter = new TestEvmAdapter()
      const wallet = await getWallet()
      wallet.ethSendTx = async () => await Promise.resolve(hash ? { hash } : null)

      return adapter.signAndBroadcastTransaction({
        senderAddress: '0x1234',
        receiverAddress: '0x1234',
        signTxInput: { wallet, txToSign: {} } as unknown as SignTxInput<ETHSignTx>,
      })
    }

    it('returns the hash from wallet.ethSendTx', async () => {
      await expect(signAndBroadcast('0xabc')).resolves.toEqual('0xabc')
    })

    it('throws when wallet.ethSendTx returns no hash', async () => {
      await expect(signAndBroadcast(null)).rejects.toThrow(/error signing & broadcasting tx/)
    })
  })

  describe('signMessage', () => {
    const message = 'Hello world 111'
    const hexMessage = '0x48656c6c6f20776f726c6420313131'

    it('signs a message', async () => {
      const adapter = new TestEvmAdapter()
      const addressNList = toAddressNList(adapter.getBip44Params({ accountNumber: 0 }))

      await expect(
        adapter.signMessage({
          wallet: await getWallet(),
          messageToSign: { message, addressNList },
        }),
      ).resolves.toEqual(
        '0x05a0edb4b98fe6b6ed270bf55aef84ddcb641512e19e340bf9eed3427854a7a4734fe45551dc24f1843cf2c823a73aa2454e3785eb15120573c522cc114e472d1c',
      )
    })

    it('throws when the wallet returns no signature', async () => {
      const adapter = new TestEvmAdapter()
      const wallet = await getWallet()
      wallet.ethSignMessage = async () => await Promise.resolve(null)
      const addressNList = toAddressNList(adapter.getBip44Params({ accountNumber: 0 }))

      await expect(
        adapter.signMessage({ wallet, messageToSign: { message, addressNList } }),
      ).rejects.toThrow(/error signing message/)
    })

    it.each([
      ['hex encodes a utf8 message', message],
      ['passes a hex message unchanged', hexMessage],
    ])('%s before passing it to the wallet', async (_, input) => {
      const adapter = new TestEvmAdapter()
      const wallet = await getWallet()
      const ethSignMessage = vi.fn().mockResolvedValue({ address: '0x', signature: '0xsig' })
      wallet.ethSignMessage = ethSignMessage
      const addressNList = toAddressNList(adapter.getBip44Params({ accountNumber: 0 }))

      await adapter.signMessage({ wallet, messageToSign: { message: input, addressNList } })

      expect(ethSignMessage).toHaveBeenCalledWith({ message: hexMessage, addressNList })
    })
  })

  describe('broadcastTransaction', () => {
    const broadcastInput = { senderAddress: '0x1234', receiverAddress: '0x1234', hex: '0x123' }

    it('broadcasts through unchained', async () => {
      const sendTx = vi.fn().mockResolvedValue('0xhash')
      const adapter = new TestEvmAdapter({ sendTx })

      await expect(adapter.broadcastTransaction(broadcastInput)).resolves.toEqual('0xhash')
      expect(sendTx).toHaveBeenCalledWith({ sendTxBody: { hex: '0x123' } })
      expect(sendRawTransaction).not.toHaveBeenCalled()
    })

    it('falls back to direct RPC when unchained fails', async () => {
      sendRawTransaction.mockResolvedValue('0xrpchash')
      const adapter = new TestEvmAdapter({ sendTx: vi.fn().mockRejectedValue(new Error('down')) })

      await expect(adapter.broadcastTransaction(broadcastInput)).resolves.toEqual('0xrpchash')
      expect(sendRawTransaction).toHaveBeenCalledWith({ serializedTransaction: '0x123' })
    })
  })
})

describe('first-class EVM chain adapters', () => {
  const args = {
    providers: { http: {}, ws: {} },
    rpcUrl: '',
    midgardUrl: '',
    thorMidgardUrl: '',
    mayaMidgardUrl: '',
  } as never

  it.each([
    ['Ethereum', new ethereum.ChainAdapter(args), ethChainId, ethAssetId, ASSET_REFERENCE.Ethereum],
    [
      'Arbitrum',
      new arbitrum.ChainAdapter(args),
      arbitrumChainId,
      arbitrumAssetId,
      ASSET_REFERENCE.Arbitrum,
    ],
    [
      'Avalanche',
      new avalanche.ChainAdapter(args),
      avalancheChainId,
      avalancheAssetId,
      ASSET_REFERENCE.AvalancheC,
    ],
    ['Base', new base.ChainAdapter(args), baseChainId, baseAssetId, ASSET_REFERENCE.Base],
    ['BSC', new bsc.ChainAdapter(args), bscChainId, bscAssetId, ASSET_REFERENCE.BnbSmartChain],
    ['Gnosis', new gnosis.ChainAdapter(args), gnosisChainId, gnosisAssetId, ASSET_REFERENCE.Gnosis],
    [
      'Optimism',
      new optimism.ChainAdapter(args),
      optimismChainId,
      optimismAssetId,
      ASSET_REFERENCE.Optimism,
    ],
    [
      'Polygon',
      new polygon.ChainAdapter(args),
      polygonChainId,
      polygonAssetId,
      ASSET_REFERENCE.Polygon,
    ],
  ])('%s has its chain id, fee asset and coin type', (_, adapter, chainId, assetId, coinType) => {
    expect(adapter.getChainId()).toEqual(chainId)
    expect(adapter.getFeeAssetId()).toEqual(assetId)
    expect(adapter.getBip44Params({ accountNumber: 0 }).coinType).toEqual(Number(coinType))
  })
})
