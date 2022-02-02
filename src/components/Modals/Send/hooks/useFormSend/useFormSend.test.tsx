import { useToast } from '@chakra-ui/react'
import {
  AssetDataSource,
  chainAdapters,
  ChainTypes,
  NetworkTypes,
  UtxoAccountType
} from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import * as reactRedux from 'react-redux'
import { EthSend } from 'test/mocks/txs'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ensLookup } from 'lib/ens'

import { SendFormFields, SendInput } from '../../Form'
import { useFormSend } from './useFormSend'

jest.mock('@chakra-ui/react')
jest.mock('react-hook-form')
jest.mock('react-polyglot', () => ({
  useTranslate: () => jest.fn()
}))

jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('context/ModalProvider/ModalProvider')
jest.mock('context/WalletProvider/WalletProvider')

jest.mock('lib/ens')

const formData: SendInput = {
  [SendFormFields.Address]: EthSend.address,
  [SendFormFields.Asset]: {
    caip2: '',
    caip19: '',
    description: '',
    chain: ChainTypes.Ethereum,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    slip44: 60,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    sendSupport: true,
    receiveSupport: true
  },
  [SendFormFields.AmountFieldError]: '',
  [SendFormFields.FeeType]: chainAdapters.FeeDataKey.Average,
  [SendFormFields.EstimatedFees]: {
    [chainAdapters.FeeDataKey.Slow]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5'
      }
    },
    [chainAdapters.FeeDataKey.Average]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5'
      }
    },
    [chainAdapters.FeeDataKey.Fast]: {
      txFee: '3100000000000000',
      chainSpecific: {
        gasLimit: '42000',
        gasPrice: '10000000000',
        satoshiPerByte: '5'
      }
    }
  },
  [SendFormFields.CryptoAmount]: '1',
  [SendFormFields.CryptoSymbol]: 'ETH',
  [SendFormFields.FiatAmount]: '3500',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'
}

const formDataEnsAddres = { ...formData, [SendFormFields.Address]: 'willywonka.eth' }

const textTxToSign = {
  addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
  value: '0x0',
  to: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
  chainId: 1,
  data: '0xa9059cbb000000000000000000000000f293f9e575aec02d3da5952b5fd95353c53a134e0000000000000000000000000000000000000000000000000000000000000000',
  nonce: '136',
  gasPrice: '0x1b3dbe5200',
  gasLimit: '0xa870'
}

const testSignedTx = '0xfakeSignedTxHash'

const expectedTx = '0xfakeTxHash'

describe('useFormSend', () => {
  const useSelectorMock = jest.spyOn(reactRedux, 'useSelector')

  beforeEach(() => {
    useSelectorMock.mockReturnValue({
      state: {
        preferences: {
          accountTypes: {
            [ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh
          }
        }
      }
    })
  })

  it('handles successfully sending a tx with ETH address', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true)
        }
      }
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signTransaction: () => Promise.resolve(testSignedTx),
        broadcastTransaction: () => Promise.resolve(expectedTx),
        getType: () => ChainTypes.Ethereum
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
  })

  it('handles successfully sending a tx with ENS name', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true)
        }
      }
    }))

    const sendClose = jest.fn()
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false
    }))
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signTransaction: () => Promise.resolve(testSignedTx),
        broadcastTransaction: () => Promise.resolve(expectedTx),
        getType: () => ChainTypes.Ethereum
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formDataEnsAddres)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
  })

  it.only('handles successfully sending an ETH address tx without offline signing', async () => {
    const toaster = jest.fn()
    const signAndBroadcastTransaction = jest.fn().mockResolvedValue('txid')
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(false),
          supportsBroadcast: jest.fn().mockReturnValue(true)
        }
      }
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signAndBroadcastTransaction,
        getType: () => ChainTypes.Ethereum
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles successfully sending an ENS name tx without offline signing', async () => {
    const toaster = jest.fn()
    const signAndBroadcastTransaction = jest.fn().mockResolvedValue('txid')
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false
    }))
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(false),
          supportsBroadcast: jest.fn().mockReturnValue(true)
        }
      }
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve(textTxToSign),
        signAndBroadcastTransaction,
        getType: () => ChainTypes.Ethereum
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formDataEnsAddres)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
    expect(signAndBroadcastTransaction).toHaveBeenCalled()
  })

  it('handles a failure while sending a tx', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: { wallet: {} }
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.reject('All these calls failed'),
        signTransaction: () => Promise.reject('All these calls failed'),
        broadcastTransaction: () => Promise.reject('All these calls failed')
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
  })
})
