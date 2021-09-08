import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { act, renderHook } from '@testing-library/react-hooks'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { getEncryptedWallet } from 'lib/nativeWallet'

import { useNativePasswordRequired } from './useNativePasswordRequired'

jest.mock('context/WalletProvider/WalletProvider', () => ({
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
  }
} = {}) => {
  //@ts-ignore
  useWallet.mockImplementation(() => ({ state: walletState, dispatch: () => {} }))
  //@ts-ignore
  useLocalStorage.mockImplementation(() => [localStorageWallet])
  const setError = jest.fn()
  const clearErrors = jest.fn()
  const comp = renderHook(() => useNativePasswordRequired({ setError, clearErrors }))
  return { ...comp, setError, clearErrors }
}

const original = console.error

describe('useNativePasswordRequired', () => {
  describe('onSumbit', () => {
    beforeEach(() => {
      console.error = jest.fn()
    })

    afterEach(() => {
      console.error = original
    })

    it('sets keyring events for wallet', async () => {
      const loadDevice = jest.fn()
      const on = jest.fn()
      //@ts-ignore
      getEncryptedWallet.mockImplementation(() =>
        Promise.resolve({
          deviceId: 'deviceId',
          decrypt: jest.fn(() => 'mnemonic')
        })
      )
      const { result, waitFor } = setup({
        localStorageWallet: { deviceId: 'wallet' },
        walletState: {
          keyring: {
            get: jest.fn(() => ({ loadDevice } as unknown as NativeHDWallet)),
            on,
            off: jest.fn()
          }
        }
      })

      act(() => {
        result.current.onSubmit({ password: '12341234' })
      })

      await waitFor(() => expect(loadDevice).toBeCalled())

      await waitFor(() => expect(on).toBeCalledTimes(2))
    })

    it('removes keyring listeners on unmount', async () => {
      const loadDevice = jest.fn()
      const on = jest.fn()
      const off = jest.fn()
      //@ts-ignore
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
      //@ts-ignore
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
    })
  })
})
