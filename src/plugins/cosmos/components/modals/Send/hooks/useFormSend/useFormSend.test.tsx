import { useToast } from '@chakra-ui/react'
import { AssetDataSource, chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { SendFormFields, SendInput } from '../../Form'
import { useFormSend } from './useFormSend'

jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: jest.fn()
}))
jest.mock('react-hook-form')
jest.mock('react-polyglot', () => ({
  useTranslate: () => jest.fn()
}))

jest.mock('context/PluginProvider/PluginProvider')
jest.mock('context/ModalProvider/ModalProvider')
jest.mock('context/WalletProvider/WalletProvider')

const formData: SendInput = {
  [SendFormFields.Address]: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner',
  [SendFormFields.Asset]: {
    caip19: 'cosmos:cosmoshub-4/slip44:118',
    caip2: 'cosmos:cosmoshub-4',
    chain: ChainTypes.Cosmos,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.COSMOSHUB_MAINNET,
    symbol: 'ATOM',
    name: 'Cosmos',
    precision: 6,
    slip44: 118,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
    explorer: 'https://www.mintscan.io/cosmos',
    explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
    explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
    sendSupport: true,
    receiveSupport: true,
    description: 'Cosmos Description'
  },
  [SendFormFields.AmountFieldError]: '',
  [SendFormFields.FeeType]: chainAdapters.FeeDataKey.Average,
  [SendFormFields.EstimatedFees]: {
    [chainAdapters.FeeDataKey.Slow]: {
      txFee: '2500',
      chainSpecific: { gasLimit: '250000' }
    },
    [chainAdapters.FeeDataKey.Average]: {
      txFee: '3500',
      chainSpecific: { gasLimit: '250000' }
    },
    [chainAdapters.FeeDataKey.Fast]: {
      txFee: '5000',
      chainSpecific: { gasLimit: '250000' }
    }
  },
  [SendFormFields.CryptoAmount]: '1',
  [SendFormFields.CryptoSymbol]: 'ATOM',
  [SendFormFields.FiatAmount]: '28',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
  [SendFormFields.Memo]: ''
}

const textTxToSign = {
  addressNList: [4242424242, 4242424242, 4242424242, 0, 0],
  tx: {
    fee: {
      amount: [
        {
          amount: '1000000',
          denom: 'uatom'
        }
      ],
      gas: '250000'
    },
    msg: [
      {
        type: 'cosmos-sdk/MsgSend',
        value: {
          amount: [
            {
              amount: '1000',
              denom: 'uatom'
            }
          ],
          from_address: 'cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
          to_address: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner'
        }
      }
    ],
    signatures: [],
    memo: ''
  },
  chain_id: 'cosmoshub-4',
  account_number: '424242',
  sequence: '12'
}

const testSignedTx = 'someFakeTxHash'

describe('useFormSend', () => {
  it('handles successfully sending a tx with ATOM address', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true),
          supportsCosmos: jest.fn().mockReturnValue(true)
        }
      }
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.resolve({ txToSign: textTxToSign }),
        signTransaction: () => Promise.resolve(testSignedTx),
        getType: () => ChainTypes.Cosmos
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
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
        broadcastTransaction: () => Promise.reject('All these calls failed'),
        getType: () => ChainTypes.Cosmos
      })
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
  })
})
