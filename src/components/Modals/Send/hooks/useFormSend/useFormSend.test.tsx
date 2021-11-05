import { useToast } from '@chakra-ui/react'
import { chainAdapters, ChainTypes, NetworkTypes, UtxoAccountType } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAllAccountTypes } from 'hooks/useAllAccountTypes/useAllAccountTypes'
import { accountTypePrefix } from 'state/slices/preferencesSlice/preferencesSlice'

import { SendInput } from '../../Form'
import { useFormSend } from './useFormSend'

jest.mock('@chakra-ui/react')
jest.mock('react-hook-form')
jest.mock('react-polyglot', () => ({
  useTranslate: () => jest.fn()
}))

jest.mock('hooks/useAllAccountTypes/useAllAccountTypes')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('context/ModalProvider/ModalProvider')
jest.mock('context/WalletProvider/WalletProvider')

const formData: SendInput = {
  address: '0xMyWalletAddres',
  asset: {
    caip19: '',
    description: '',
    price: '',
    marketCap: '',
    volume: '',
    changePercent24Hr: 0,
    chain: ChainTypes.Ethereum,
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
    sendSupport: true,
    receiveSupport: true
  },
  feeType: chainAdapters.FeeDataKey.Average,
  estimatedFees: {
    [chainAdapters.FeeDataKey.Slow]: {
      chainSpecific: {
        feeLimit: '42000',
        feePerTx: '3100000000000000'
      },
      feePerUnit: '76000000000'
    },
    [chainAdapters.FeeDataKey.Average]: {
      chainSpecific: {
        feeLimit: '42000',
        feePerTx: '4900000000000000'
      },
      feePerUnit: '118000000000'
    },
    [chainAdapters.FeeDataKey.Fast]: {
      chainSpecific: {
        feeLimit: '42000',
        feePerTx: '6120000000000000'
      },
      feePerUnit: '145845250000'
    }
  },
  crypto: {
    amount: '1',
    symbol: 'ETH'
  },
  fiat: {
    amount: '3500',
    symbol: 'USD'
  },
  transaction: {}
}

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
  beforeEach(() => {
    ;(useAllAccountTypes as jest.Mock<unknown>).mockImplementation(() => ({
      [accountTypePrefix + ChainTypes.Bitcoin]: UtxoAccountType.SegwitP2sh
    }))
  })

  it('handles successfully sending a tx', async () => {
    return await act(async () => {
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
  })

  it('handles successfully sending a tx without offline signing', async () => {
    return await act(async () => {
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
  })

  it('handles a failure while sending a tx', async () => {
    return await act(async () => {
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
})
