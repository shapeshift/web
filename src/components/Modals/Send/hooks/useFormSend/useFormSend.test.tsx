import type { CreateToastFnReturn } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/react'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { KnownChainIds } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react'
import { ethereum as mockEthereum } from 'test/mocks/assets'
import { EthSend } from 'test/mocks/txs'
import { describe, expect, it, vi } from 'vitest'
import type { BaseProps, Modals } from 'context/ModalProvider/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { IWalletContext } from 'context/WalletProvider/WalletContext'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensLookup } from 'lib/address/ens'

import type { SendInput } from '../../Form'
import { SendFormFields } from '../../SendCommon'
import { useFormSend } from './useFormSend'

vi.mock('@shapeshiftoss/metamask-snaps-adapter', async () => {
  const actual = await vi.importActual('@shapeshiftoss/metamask-snaps-adapter')
  return {
    ...actual,
    shapeShiftSnapInstalled: vi.fn(),
  }
})

vi.mock('state/slices/selectors', async () => {
  const actual = await vi.importActual('state/slices/selectors')
  return {
    ...actual,
    selectPortfolioAccountMetadataByAccountId: () => ({
      bip44Params: {
        purpose: 44,
        coinType: 60,
        accountNumber: 0,
      },
    }),
    selectAssetById: vi.fn(() => mockEthereum),
    selectMarketDataByAssetIdUserCurrency: () => ({ price: '2000' }),
  }
})

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react')
  return {
    ...actual,
    useToast: vi.fn(),
  }
})

vi.mock('@shapeshiftoss/hdwallet-core', async () => {
  const actual = await vi.importActual('@shapeshiftoss/hdwallet-core')
  return {
    ...actual,
    supportsETH: vi.fn(),
  }
})
vi.mock('react-hook-form')
vi.mock('react-polyglot', () => ({
  useTranslate: () => vi.fn(),
}))

vi.mock('context/PluginProvider/chainAdapterSingleton')
vi.mock('context/PluginProvider/PluginProvider')
vi.mock('hooks/useModal/useModal')
vi.mock('hooks/useWallet/useWallet')

const mockEvmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.ArbitrumNovaMainnet,
  KnownChainIds.BaseMainnet,
]
vi.mock('lib/utils/evm', async () => {
  const actual = await vi.importActual('lib/utils/evm')
  return {
    ...actual,
    getSupportedEvmChainIds: () => mockEvmChainIds,
  }
})

vi.mock('lib/address/ens')

const formData: SendInput<KnownChainIds.EthereumMainnet> = {
  [SendFormFields.Input]: '',
  [SendFormFields.From]: '',
  [SendFormFields.To]: EthSend.pubkey,
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
  [SendFormFields.AmountCryptoPrecision]: '1',
  [SendFormFields.FiatAmount]: '3500',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'eip155:1:0x3155ba85d5f96b2d030a4966af206230e46849cb',
}

const formDataEnsAddress = { ...formData, [SendFormFields.To]: 'willywonka.eth' }

const testSendAddress = '0x3155ba85d5f96b2d030a4966af206230e46849cb'

const testTxToSign = {
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
    const toaster = vi.fn() as unknown as CreateToastFnReturn
    vi.mocked(shapeShiftSnapInstalled).mockImplementation(() => Promise.resolve(false))
    vi.mocked(useToast).mockImplementation(() => toaster)
    vi.mocked(useWallet).mockImplementation(
      () =>
        ({
          state: {
            wallet: {
              supportsOfflineSigning: vi.fn().mockReturnValue(true),
              ethSupportsEIP1559: vi.fn().mockReturnValue(walletSupportsEIP1559),
            },
          },
        }) as unknown as IWalletContext,
    )
    vi.mocked(supportsETH).mockReturnValue(true)

    const sendClose = vi.fn()
    const qrClose = vi.fn()
    vi.mocked(useModal).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose } as unknown as BaseProps<any>
        case 'send':
          return { close: sendClose } as unknown as BaseProps<any>
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      getAddress: () => Promise.resolve(testSendAddress),
      buildSendTransaction: () => Promise.resolve(testTxToSign),
      signTransaction: () => Promise.resolve(testSignedTx),
      broadcastTransaction: () => Promise.resolve(expectedTx),
    }
    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    vi.mocked(getChainAdapterManager).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]) as unknown as ChainAdapterManager,
    )

    const { result } = renderHook(() => useFormSend())
    vi.useFakeTimers()
    await result.current.handleFormSend(formData, true)
    vi.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })

  it('handles successfully sending a tx with ENS name', async () => {
    const toaster = vi.fn() as unknown as CreateToastFnReturn
    vi.mocked(shapeShiftSnapInstalled).mockImplementation(() => Promise.resolve(false))
    vi.mocked(useToast).mockImplementation(() => toaster)
    vi.mocked(useWallet).mockImplementation(
      () =>
        ({
          state: {
            wallet: {
              supportsOfflineSigning: vi.fn().mockReturnValue(true),
              ethSupportsEIP1559: vi.fn().mockReturnValue(walletSupportsEIP1559),
            },
          },
        }) as unknown as IWalletContext,
    )
    vi.mocked(supportsETH).mockReturnValue(true)

    const sendClose = vi.fn()
    const qrClose = vi.fn()
    vi.mocked(ensLookup).mockImplementation(() =>
      Promise.resolve('0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c'),
    )
    vi.mocked(useModal).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose } as unknown as BaseProps<any>
        case 'send':
          return { close: sendClose } as unknown as BaseProps<any>
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      getAddress: () => Promise.resolve(testSendAddress),
      buildSendTransaction: () => Promise.resolve(testTxToSign),
      signTransaction: () => Promise.resolve(testSignedTx),
      broadcastTransaction: () => Promise.resolve(expectedTx),
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    vi.mocked(getChainAdapterManager).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]) as unknown as ChainAdapterManager,
    )

    const { result } = renderHook(() => useFormSend())
    vi.useFakeTimers()
    await result.current.handleFormSend(formDataEnsAddress, true)
    vi.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })

  it('handles successfully sending an ETH address tx without offline signing', async () => {
    const toaster = vi.fn() as unknown as CreateToastFnReturn
    const signAndBroadcastTransaction = vi.fn().mockResolvedValue('txid')
    vi.mocked(shapeShiftSnapInstalled).mockImplementation(() => Promise.resolve(false))
    vi.mocked(useToast).mockImplementation(() => toaster)
    vi.mocked(useWallet).mockImplementation(
      () =>
        ({
          state: {
            wallet: {
              supportsOfflineSigning: vi.fn().mockReturnValue(false),
              supportsBroadcast: vi.fn().mockReturnValue(true),
              ethSupportsEIP1559: vi.fn().mockReturnValue(walletSupportsEIP1559),
            },
          },
        }) as unknown as IWalletContext,
    )
    vi.mocked(supportsETH).mockReturnValue(true)

    const sendClose = vi.fn()
    const qrClose = vi.fn()
    vi.mocked(useModal).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose } as unknown as BaseProps<any>
        case 'send':
          return { close: sendClose } as unknown as BaseProps<any>
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      getAddress: () => Promise.resolve(testSendAddress),
      buildSendTransaction: () => Promise.resolve(testTxToSign),
      signAndBroadcastTransaction,
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    vi.mocked(getChainAdapterManager).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]) as unknown as ChainAdapterManager,
    )

    const { result } = renderHook(() => useFormSend())
    vi.useFakeTimers()
    await result.current.handleFormSend(formData, true)
    vi.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles successfully sending an ENS name tx without offline signing', async () => {
    const mockWallet = {
      supportsOfflineSigning: vi.fn().mockReturnValue(false),
      supportsBroadcast: vi.fn().mockReturnValue(true),
      ethSupportsEIP1559: vi.fn().mockReturnValue(walletSupportsEIP1559),
    } as unknown as HDWallet
    const toaster = vi.fn() as unknown as CreateToastFnReturn
    const signAndBroadcastTransaction = vi.fn().mockResolvedValue('txid')
    vi.mocked(ensLookup).mockImplementation(() =>
      Promise.resolve('0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c'),
    )
    vi.mocked(shapeShiftSnapInstalled).mockImplementation(() => Promise.resolve(false))
    vi.mocked(useToast).mockImplementation(() => toaster)
    vi.mocked(useWallet).mockImplementation(
      () =>
        ({
          state: {
            wallet: mockWallet,
          },
        }) as unknown as IWalletContext,
    )
    vi.mocked(supportsETH).mockReturnValue(true)

    const sendClose = vi.fn()
    const qrClose = vi.fn()
    vi.mocked(useModal).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose } as unknown as BaseProps<any>
        case 'send':
          return { close: sendClose } as unknown as BaseProps<any>
        default:
          throw Error('invalid key')
      }
    })
    const mockAdapter = {
      getAddress: () => Promise.resolve(testSendAddress),
      buildSendTransaction: () => Promise.resolve(testTxToSign),
      signAndBroadcastTransaction,
    }

    const mockEthereumAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.EthereumMainnet,
      getChainId: () => KnownChainIds.EthereumMainnet,
      getFeeAssetId: () => ethAssetId,
    }

    vi.mocked(getChainAdapterManager).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]) as unknown as ChainAdapterManager,
    )

    const { result } = renderHook(() => useFormSend())
    vi.useFakeTimers()
    await result.current.handleFormSend(formDataEnsAddress, true)
    vi.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles a failure while sending a tx', async () => {
    const toaster = vi.fn() as unknown as CreateToastFnReturn
    vi.mocked(shapeShiftSnapInstalled).mockImplementation(() => Promise.resolve(false))
    vi.mocked(useToast).mockImplementation(() => toaster)
    vi.mocked(useWallet).mockImplementation(
      () =>
        ({
          state: { wallet: {} },
        }) as unknown as IWalletContext,
    )

    const sendClose = vi.fn()
    const qrClose = vi.fn()
    vi.mocked(useModal).mockImplementation((key: keyof Modals) => {
      switch (key) {
        case 'qrCode':
          return { close: qrClose } as unknown as BaseProps<any>
        case 'send':
          return { close: sendClose } as unknown as BaseProps<any>
        default:
          throw Error('invalid key')
      }
    })

    const mockAdapter = {
      getAddress: () => Promise.resolve(testSendAddress),
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

    vi.mocked(getChainAdapterManager).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockEthereumAdapter],
        ]) as unknown as ChainAdapterManager,
    )

    const { result } = renderHook(() => useFormSend())
    await result.current.handleFormSend(formData, true)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
    expect(qrClose).toHaveBeenCalled()
  })
})
