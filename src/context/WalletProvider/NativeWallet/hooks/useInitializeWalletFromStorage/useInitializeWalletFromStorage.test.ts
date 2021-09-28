import { renderHook } from '@testing-library/react-hooks'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'

import { useInitializeWalletFromStorage } from './useInitializeWalletFromStorage'

jest.mock('context/WalletProvider/WalletProvider', () => ({
  useWallet: jest.fn()
}))

jest.mock('hooks/useLocalStorage/useLocalStorage', () => ({
  useLocalStorage: jest.fn()
}))

const setup = ({ localStorageWallet = {}, walletState = {} } = {}) => {
  // @ts-ignore
  useWallet.mockImplementation(() => ({ state: walletState, dispatch: () => {} }))
  // @ts-ignore
  useLocalStorage.mockImplementation(() => [localStorageWallet])

  return renderHook(() => useInitializeWalletFromStorage())
}

describe('useInitializeWalletFromStorage', () => {
  it('initializes device', async () => {
    const initialize = jest.fn(() => Promise.resolve())
    const pairDevice = jest.fn(() => Promise.resolve({ initialize }))

    const { waitFor } = setup({
      localStorageWallet: { deviceId: 'deviceId' },
      walletState: {
        adapters: { native: { pairDevice } }
      }
    })

    await waitFor(() => expect(initialize).toBeCalled())
  })

  it('does not initialize device', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const pairDevice = jest.fn(() => Promise.reject())

    const { waitFor } = setup({
      localStorageWallet: { deviceId: 'deviceId' },
      walletState: {
        adapters: { native: { pairDevice } }
      }
    })

    await waitFor(() => expect(console.error).toBeCalled())
    consoleError.mockRestore()
  })
})
