import { renderHook, act } from '@testing-library/react-hooks'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'

import { useNativeSuccess } from './useNativeSuccess'

jest.mock('context/WalletProvider/WalletProvider', () => ({
  useWallet: jest.fn(),
  WalletActions: { SET_WALLET: 'SET_WALLET' }
}))

jest.mock('hooks/useLocalStorage/useLocalStorage', () => ({
  useLocalStorage: jest.fn()
}))

jest.mock('@shapeshiftoss/hdwallet-native/dist/crypto', () => {
  return function () {
    return {
      deviceId: '1234',
      encryptedWallet: 'test'
    }
  }
})


const setup = ({
  encryptedWallet,
  walletState
}: {
  encryptedWallet?: EncryptedWallet
  walletState: Object
}) => {
  // @ts-ignore
  useWallet.mockImplementation(() => ({ state: walletState, dispatch: () => {} }))
  // @ts-ignore
  useLocalStorage.mockImplementation(() => [jest.fn(), jest.fn()])
  const encryptedWallet = new EncryptedWallet()

  return renderHook(() => useNativeSuccess({ encryptedWallet }))
}

describe('useNativeSuccess', () => {
  it('successfully initialize wallet', async () => {
    const pairDevice = jest.fn(() => ({ loadDevice: jest.fn(() => Promise.resolve()) }))
    const mnemonic = 'one two three four five six seven'

    const { result, waitForValueToChange } = setup({
      encryptedWallet: {
        deviceId: '1234',
        encryptedWallet: 'test',
        isInitialized: true,
        email: 'test',
        passwordHash: '1234',
        init: jest.fn(),
        createWallet: jest.fn(),
        decrypt: jest.fn(() => Promise.resolve(mnemonic)),
        reset: jest.fn()
      },
      walletState: {
        adapters: { native: { pairDevice } }
      }
    })

    await waitForValueToChange(() => result.current.isSuccessful)
    expect(result.current.isSuccessful).toBeTruthy()
  })

  it('unsuccesffully initialize wallet if no native adapter is provided', async () => {
    const { result } = setup({
      encryptedWallet: { deviceId: '1234', encryptedWallet: 'test' },
      walletState: { adapters: { native: null } }
    })

    expect(result.current.isSuccessful).toBeFalsy()
  })

  it('unsuccesffully initialize wallet if no encryptedWallet string is provided', async () => {
    const pairDevice = jest.fn(() => ({ loadDevice: jest.fn(() => Promise.resolve()) }))
    const { result } = setup({
      encryptedWallet: { deviceId: '1234' },
      walletState: { adapters: { native: { pairDevice } } }
    })

    expect(result.current.isSuccessful).toBeFalsy()
  })
})
