import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { act, renderHook } from '@testing-library/react-hooks'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { getEncryptedWallet } from 'lib/nativeWallet'

import { useNativePasswordRequired } from './useNativePasswordRequired'

jest.mock('context/WalletProvider/WalletProvider', () => ({
  WalletActions: { SET_WALLET: 'SET_WALLET' },
  useWallet: jest.fn()
}))

jest.mock('hooks/useLocalStorage/useLocalStorage', () => ({
  useLocalStorage: jest.fn()
}))

jest.mock('lib/nativeWallet', () => ({
  getEncryptedWallet: jest.fn()
}))

const setup = ({
  localStorageWallet = {},
  walletState = {
    keyring: {
      get: jest.fn(() => ({ loadDevice: jest.fn() } as unknown as NativeHDWallet)),
      on: jest.fn(),
      off: jest.fn()
    }
  },
  dispatch = jest.fn()
} = {}) => {
  const setError = jest.fn()
  const clearErrors = jest.fn()
  // @ts-ignore
  useWallet.mockImplementation(() => ({ state: walletState, dispatch }))
  //@ts-ignore
  useLocalStorage.mockImplementation(() => [localStorageWallet])
  const comp = renderHook(() => useNativePasswordRequired({ setError, clearErrors }))
  return { ...comp, setError, clearErrors, dispatch }
}

describe('useNativePasswordRequired', () => {
  describe('onSumbit', () => {
    it('sets keyring events for wallet', async () => {
      const loadDevice = jest.fn()
      const on = jest.fn()
      // @ts-ignore
      getEncryptedWallet.mockImplementation(() =>
        Promise.resolve({
          deviceId: 'deviceId',
          decrypt: jest.fn(() => 'mnemonic')
        })
      )
      const walletState = {
        keyring: {
          get: jest.fn(() => ({ loadDevice } as unknown as NativeHDWallet)),
          on,
          off: jest.fn()
        }
      }
      const { result, waitFor, dispatch, rerender } = setup({
        localStorageWallet: { deviceId: 'wallet' },
        walletState
      })

      // on is initially set up to make sure it responds to wallet changes
      await waitFor(() => expect(on).toBeCalledTimes(2))

      act(() => {
        result.current.onSubmit({ password: '12341234' })
      })

      await waitFor(() => expect(loadDevice).toBeCalled())

      await waitFor(() => expect(dispatch).toBeCalled())
      // rerender with new wallet state
      // @ts-ignore
      useWallet.mockImplementation(() => ({ state: { ...walletState, wallet: {} }, dispatch }))
      rerender()
      // calls two more times after onSubmit is successfully called
      await waitFor(() => expect(on).toBeCalledTimes(4))
    })

    it('removes keyring listeners on unmount', async () => {
      const loadDevice = jest.fn()
      const on = jest.fn()
      const off = jest.fn()
      // @ts-ignore
      getEncryptedWallet.mockImplementation(() =>
        Promise.resolve({
          deviceId: 'deviceId',
          decrypt: jest.fn(() => 'mnemonic')
        })
      )
      const { result, waitFor, unmount } = setup({
        localStorageWallet: { deviceId: 'wallet' },
        walletState: {
          keyring: {
            get: jest.fn(() => ({ loadDevice } as unknown as NativeHDWallet)),
            on,
            off
          }
        }
      })

      act(() => {
        result.current.onSubmit({ password: '12341234' })
      })

      await waitFor(() => expect(on).toBeCalledTimes(2))
      unmount()
      await waitFor(() => expect(off).toBeCalled())
    })

    it('sets error if it fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      // @ts-ignore
      getEncryptedWallet.mockImplementation(() => Promise.reject())
      const { result, waitFor, setError } = setup({
        localStorageWallet: { deviceId: 'wallet' }
      })

      act(() => {
        result.current.onSubmit({ password: '12341234' })
      })

      await waitFor(() =>
        expect(setError).toBeCalledWith('password', { message: 'Invalid password' })
      )
      consoleError.mockRestore()
    })
  })
})
