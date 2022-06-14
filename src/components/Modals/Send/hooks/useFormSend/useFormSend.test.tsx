import { useToast } from '@chakra-ui/react'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes, NetworkTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import * as reactRedux from 'react-redux'
import { ethAssetId, ethChainId } from 'test/mocks/accounts'
import { EthSend } from 'test/mocks/txs'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensLookup } from 'lib/address/ens'

import type { SendInput } from '../../Form'
import { SendFormFields } from '../../SendCommon'
import { useFormSend } from './useFormSend'

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

jest.mock('context/PluginProvider/PluginProvider')
jest.mock('hooks/useModal/useModal')
jest.mock('hooks/useWallet/useWallet')

jest.mock('lib/address/ens')

const formData: SendInput = {
  [SendFormFields.Input]: '',
  [SendFormFields.Address]: EthSend.address,
  [SendFormFields.VanityAddress]: '',
  [SendFormFields.Asset]: {
    chainId: ethChainId,
    assetId: ethAssetId,
    description: '',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
  },
  [SendFormFields.AmountFieldError]: '',
  [SendFormFields.FeeType]: chainAdapters.FeeDataKey.Average,
  [SendFormFields.EstimatedFees]: {
    [chainAdapters.FeeDataKey.Slow]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5',
      },
    },
    [chainAdapters.FeeDataKey.Average]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5',
      },
    },
    [chainAdapters.FeeDataKey.Fast]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5',
      },
    },
  },
  [SendFormFields.CryptoAmount]: '1',
  [SendFormFields.CryptoSymbol]: 'ETH',
  [SendFormFields.FiatAmount]: '3500',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb',
}

const formDataEnsAddress = { ...formData, [SendFormFields.Address]: 'willywonka.eth' }

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
  const useSelectorMock = jest.spyOn(reactRedux, 'useSelector')

  beforeEach(() => {
    useSelectorMock.mockReturnValue({
      state: {
        preferences: {
          accountTypes: {
            [ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh,
          },
        },
      },
    })
  })

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
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signTransaction: () => Promise.resolve(testSignedTx),
        broadcastTransaction: () => Promise.resolve(expectedTx),
        getType: () => ChainTypes.Ethereum,
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleSend(formData)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
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
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false,
    }))
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signTransaction: () => Promise.resolve(testSignedTx),
        broadcastTransaction: () => Promise.resolve(expectedTx),
        getType: () => ChainTypes.Ethereum,
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleSend(formDataEnsAddress)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
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
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signAndBroadcastTransaction,
        getType: () => ChainTypes.Ethereum,
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleSend(formData)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles successfully sending an ENS name tx without offline signing', async () => {
    const toaster = jest.fn()
    const signAndBroadcastTransaction = jest.fn().mockResolvedValue('txid')
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false,
    }))
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
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signAndBroadcastTransaction,
        getType: () => ChainTypes.Ethereum,
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleSend(formDataEnsAddress)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles a failure while sending a tx', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: { wallet: {} },
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.reject('All these calls failed'),
        signTransaction: () => Promise.reject('All these calls failed'),
        broadcastTransaction: () => Promise.reject('All these calls failed'),
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
  })
})
