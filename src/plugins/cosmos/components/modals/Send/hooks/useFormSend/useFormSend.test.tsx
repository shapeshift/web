import { useToast } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FeeData } from '@shapeshiftoss/chain-adapters/dist/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react'
import * as reactRedux from 'react-redux'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { SendInput } from '../../Form'
import { SendFormFields } from '../../SendCommon'
import { useFormSend } from './useFormSend'

jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: jest.fn(),
}))
jest.mock('react-hook-form')
jest.mock('react-polyglot', () => ({
  useTranslate: () => jest.fn(),
}))

jest.mock('context/PluginProvider/PluginProvider')
jest.mock('context/PluginProvider/chainAdapterSingleton')
jest.mock('hooks/useModal/useModal')
jest.mock('hooks/useWallet/useWallet')

const formData: SendInput = {
  [SendFormFields.Address]: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner',
  [SendFormFields.Asset]: {
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    chainId: 'cosmos:cosmoshub-4',
    symbol: 'ATOM',
    name: 'Cosmos',
    precision: 6,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
    explorer: 'https://www.mintscan.io/cosmos',
    explorerAddressLink: 'https://www.mintscan.io/cosmos/account/',
    explorerTxLink: 'https://www.mintscan.io/cosmos/txs/',
    description: 'Cosmos Description',
  },
  [SendFormFields.AmountFieldError]: '',
  [SendFormFields.FeeType]: FeeDataKey.Average,
  [SendFormFields.EstimatedFees]: {
    [FeeDataKey.Slow]: {
      txFee: '2500',
      chainSpecific: { gasLimit: '250000' },
    },
    [FeeDataKey.Average]: {
      txFee: '3500',
      chainSpecific: { gasLimit: '250000' },
    },
    [FeeDataKey.Fast]: {
      txFee: '5000',
      chainSpecific: { gasLimit: '250000' },
    },
  } as { [k in FeeDataKey]: FeeData<KnownChainIds.CosmosMainnet> },
  [SendFormFields.CryptoAmount]: '1',
  [SendFormFields.CryptoSymbol]: 'ATOM',
  [SendFormFields.FiatAmount]: '28',
  [SendFormFields.FiatSymbol]: 'USD',
  [SendFormFields.SendMax]: false,
  [SendFormFields.AccountId]: 'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
  [SendFormFields.Memo]: '',
}

const textTxToSign = {
  addressNList: [4242424242, 4242424242, 4242424242, 0, 0],
  tx: {
    fee: {
      amount: [
        {
          amount: '1000000',
          denom: 'uatom',
        },
      ],
      gas: '250000',
    },
    msg: [
      {
        type: 'cosmos-sdk/MsgSend',
        value: {
          amount: [
            {
              amount: '1000',
              denom: 'uatom',
            },
          ],
          from_address: 'cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
          to_address: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner',
        },
      },
    ],
    signatures: [],
    memo: '',
  },
  chain_id: 'cosmoshub-4',
  account_number: '424242',
  sequence: '12',
}

const testSignedTx = 'someFakeTxHash'

describe('useFormSend', () => {
  const useSelectorMock = jest.spyOn(reactRedux, 'useSelector')
  beforeEach(() => {
    useSelectorMock.mockReturnValue({
      [formData[SendFormFields.AccountId]]: {
        bip44Params: {
          purpose: 44,
          coinType: 118,
          accountNumber: 0,
        },
      },
    })
  })
  it('handles successfully sending a tx with ATOM address', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {
          supportsOfflineSigning: jest.fn().mockReturnValue(true),
          supportsCosmos: jest.fn().mockReturnValue(true),
        },
      },
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    const mockAdapter = {
      buildSendTransaction: () => Promise.resolve({ txToSign: textTxToSign }),
      signTransaction: () => Promise.resolve(testSignedTx),
      signAndBroadcastTransaction: () => Promise.resolve(testSignedTx),
    }

    const mockCosmosAdapter = {
      ...mockAdapter,
      getType: () => KnownChainIds.CosmosMainnet,
      getChainId: () => KnownChainIds.CosmosMainnet,
    }
    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockCosmosAdapter],
          [KnownChainIds.EthereumMainnet, mockAdapter],
        ]),
    )

    const { result } = renderHook(() => useFormSend())
    jest.useFakeTimers()
    await result.current.handleSend(formData)
    jest.advanceTimersByTime(5000)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    expect(sendClose).toHaveBeenCalled()
  })

  it('handles a failure while sending a tx', async () => {
    const toaster = jest.fn()
    ;(useToast as jest.Mock<unknown>).mockImplementation(() => toaster)
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: { wallet: {} },
    }))

    const sendClose = jest.fn()
    ;(useModal as jest.Mock<unknown>).mockImplementation(() => ({ send: { close: sendClose } }))
    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        buildSendTransaction: () => Promise.reject('All these calls failed'),
        signTransaction: () => Promise.reject('All these calls failed'),
        broadcastTransaction: () => Promise.reject('All these calls failed'),
        getType: () => KnownChainIds.CosmosMainnet,
      }),
    }))

    const { result } = renderHook(() => useFormSend())
    await result.current.handleSend(formData)
    expect(toaster).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
    expect(sendClose).toHaveBeenCalled()
  })
})
