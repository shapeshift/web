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
        decrypt: jest.fn(() => Promise.resolve(mnemonic))
      } as unknown as EncryptedWallet,
      walletState: {
        adapters: { native: { pairDevice } }
      }
    })

    await waitForValueToChange(() => result.current.isSuccessful)
    expect(result.current.isSuccessful).toBeTruthy()
  })

  it('unsuccesffully initialize wallet if no native adapter is provided', async () => {
    const { result } = setup({
      encryptedWallet: { deviceId: '1234', encryptedWallet: 'test' } as unknown as EncryptedWallet,
      walletState: { adapters: { native: null } }
    })

    expect(result.current.isSuccessful).toBeFalsy()
  })

  it('unsuccesffully initialize wallet if no encryptedWallet string is provided', async () => {
    const pairDevice = jest.fn(() => ({ loadDevice: jest.fn(() => Promise.resolve()) }))
    const { result } = setup({
      encryptedWallet: { deviceId: '1234' } as unknown as EncryptedWallet,
      walletState: { adapters: { native: { pairDevice } } }
    })

    expect(result.current.isSuccessful).toBeFalsy()
  })

  it('unsuccesffully initialize wallet if error occurs', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const pairDevice = jest.fn(() => ({ loadDevice: jest.fn(() => Promise.resolve()) }))
    const { result, waitFor } = setup({
      encryptedWallet: {
        deviceId: '1234',
        encryptedWallet: 'test',
        decrypt: jest.fn(() => Promise.reject('An error occured with decrypt'))
      } as unknown as EncryptedWallet,
      walletState: { adapters: { native: { pairDevice } } }
    })

    await waitFor(() => expect(console.error).toBeCalled())
    expect(result.current.isSuccessful).toBeFalsy()
    consoleError.mockRestore()
  })
})
