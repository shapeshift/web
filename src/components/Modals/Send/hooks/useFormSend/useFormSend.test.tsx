import { useToast } from '@chakra-ui/react'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react'
import { ethereum as mockEthereum } from 'test/mocks/assets'
import { EthSend } from 'test/mocks/txs'
import type { Modals } from 'context/ModalProvider/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensLookup } from 'lib/address/ens'

import type { SendInput } from '../../Form'
import { SendFormFields } from '../../SendCommon'
import { useFormSend } from './useFormSend'

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectPortfolioAccountMetadataByAccountId: () => ({
    bip44Params: {
      purpose: 44,
      coinType: 60,
      accountNumber: 0,
    },
  }),
  selectAssetById: jest.fn(() => mockEthereum),
  selectMarketDataById: () => ({ price: '2000' }),
}))

jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: jest.fn(),
}))
jest.mock('@shapeshiftoss/hdwallet-core', () => ({
  ...jest.requireActual('@shapeshiftoss/hdwallet-core'),
  supportsETH: jest.fn(),
}))
jest.mock('react-hook-form')
jest.mock('react-polyglot', () => ({
  useTranslate: () => jest.fn(),
}))

jest.mock('context/PluginProvider/chainAdapterSingleton')
jest.mock('context/PluginProvider/PluginProvider')
jest.mock('hooks/useModal/useModal')
jest.mock('hooks/useWallet/useWallet')

const mockEvmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
]
jest.mock('hooks/useEvm/useEvm', () => ({
  ...jest.requireActual('hooks/useEvm/useEvm'),
  getSupportedEvmChainIds: () => mockEvmChainIds,
}))

jest.mock('lib/address/ens')

const formData: SendInput<KnownChainIds.EthereumMainnet> = {
  [SendFormFields.Input]: '',
  [SendFormFields.From]: '',
  [SendFormFields.To]: EthSend.address,
  [SendFormFields.VanityAddress]: '',
  [SendFormFields.AssetId]: ethAssetId,
  [SendFormFields.AmountFieldError]: '',
  [SendFormFields.FeeType]: FeeDataKey.Average,
  [SendFormFields.EstimatedFees]: {
    [FeeDataKey.Slow]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        maxFeePerGas: '0x1b3dbe5200',
        maxPriorityFeePerGas: '0x1b3dbe5200',
      },
    },
    [FeeDataKey.Average]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        maxFeePerGas: '0x1b3dbe5200',
        maxPriorityFeePerGas: '0x1b3dbe5200',
      },
    },
    [FeeDataKey.Fast]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        maxFeePerGas: '0x1b3dbe5200',
        maxPriorityFeePerGas: '0x1b3dbe5200',
      },
    },
  },
  [SendFormFields.CryptoAmount]: '1',
  [SendFormFields.FiatAmount]: '3500',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb',
}

const formDataEnsAddress = { ...formData, [SendFormFields.To]: 'willywonka.eth' }

const textTxToSign = {
  addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
  value: '0x0',
  to: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  chainId: ethChainId,
  data: '0xa9059cbb000000000000000000000000f293f9e575aec02d3da5952b5fd95353c53a134e0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '136',
  gasPrice: '0x1b3dbe5200',
  maxFeePerGas: '0x1b3dbe5200',
  maxPriorityFeePerGas: '0x1b3dbe5200',
  gasLimit: '0xa870',
}

const testSignedTx = '0xfakeSignedTxHash'

const expectedTx = '0xfakeTxHash'

describe.each([
  ['wallet does not support EIP-1559', false],
  ['wallet supports EIP-1559', true],
])('useFormSend (%s)', (_, walletSupportsEIP1559) => {
  it('handles successfully sending a tx with ETH address', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true),
          ethSupportsEIP1559: jest.fn().mockReturnValue(walletSupportsEIP1559),
        },
      },
    }))
    ;(supportsETH as unknown as jest.Mock<unknown>).mockReturnValue(true)

    const sendClose = jest.fn()
    const qrClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose }
        case 'send':
          return { close: sendClose }
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      buildSendTransaction: () => Promise.resolve(textTxToSign),
      signTransaction: () => Promise.resolve(testSignedTx),
      broadcastTransaction: () => Promise.resolve(expectedTx),
    }
    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleFormSend(formData)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })

  it('handles successfully sending a tx with ENS name', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true),
          ethSupportsEIP1559: jest.fn().mockReturnValue(walletSupportsEIP1559),
        },
      },
    }))
    ;(supportsETH as unknown as jest.Mock<unknown>).mockReturnValue(true)

    const sendClose = jest.fn()
    const qrClose = jest.fn()
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(() =>
      Promise.resolve({
        address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
        error: false,
      }),
    )
    ;(useModal as jest.Mock<unknown>).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose }
        case 'send':
          return { close: sendClose }
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      buildSendTransaction: () => Promise.resolve(textTxToSign),
      signTransaction: () => Promise.resolve(testSignedTx),
      broadcastTransaction: () => Promise.resolve(expectedTx),
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleFormSend(formDataEnsAddress)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })

  it('handles successfully sending an ETH address tx without offline signing', async () => {
    const toaster = jest.fn()
    const signAndBroadcastTransaction = jest.fn().mockResolvedValue('txid')
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(false),
          supportsBroadcast: jest.fn().mockReturnValue(true),
          ethSupportsEIP1559: jest.fn().mockReturnValue(walletSupportsEIP1559),
        },
      },
    }))
    ;(supportsETH as unknown as jest.Mock<unknown>).mockReturnValue(true)

    const sendClose = jest.fn()
    const qrClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose }
        case 'send':
          return { close: sendClose }
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      buildSendTransaction: () => Promise.resolve(textTxToSign),
      signAndBroadcastTransaction,
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleFormSend(formData)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles successfully sending an ENS name tx without offline signing', async () => {
    const mockWallet = {
      supportsOfflineSigning: jest.fn().mockReturnValue(false),
      supportsBroadcast: jest.fn().mockReturnValue(true),
      ethSupportsEIP1559: jest.fn().mockReturnValue(walletSupportsEIP1559),
    } as unknown as HDWallet
    const toaster = jest.fn()
    const signAndBroadcastTransaction = jest.fn().mockResolvedValue('txid')
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(() => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false,
    }))
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: mockWallet,
      },
    }))
    ;(supportsETH as unknown as jest.Mock<unknown>).mockReturnValue(true)

    const sendClose = jest.fn()
    const qrClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose }
        case 'send':
          return { close: sendClose }
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      buildSendTransaction: () => Promise.resolve(textTxToSign),
      signAndBroadcastTransaction,
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleFormSend(formDataEnsAddress)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles a failure while sending a tx', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: { wallet: {} },
    }))

    const sendClose = jest.fn()
    const qrClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose }
        case 'send':
          return { close: sendClose }
        default:
          throw Error('invalid key')
      }
    })

    const mockAdapter = {
      buildSendTransaction: () => Promise.reject('All these calls failed'),
      signTransaction: () => Promise.reject('All these calls failed'),
      broadcastTransaction: () => Promise.reject('All these calls failed'),
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    await expect(result.current.handleFormSend(formData)).rejects.toThrow()
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })
})
