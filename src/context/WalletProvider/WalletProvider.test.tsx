import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { TestProviders } from 'test/TestProviders'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import { WalletProvider } from './WalletProvider'

jest.mock('@shapeshiftoss/hdwallet-keepkey-webusb', () => ({
  WebUSBKeepKeyAdapter: {
    useKeyring: jest.fn(),
  },
}))

jest.mock('friendly-challenge', () => ({
  WidgetInstance: {},
}))

jest.mock('@shapeshiftoss/hdwallet-metamask', () => ({
  MetaMaskAdapter: {
    useKeyring: jest.fn(),
  },
}))

const walletInfoPayload = {
  name: SUPPORTED_WALLETS.native.name,
  icon: SUPPORTED_WALLETS.native.icon,
  deviceId: '',
  meta: { label: '', address: '' },
}
const setup = async () => {
  // @ts-ignore
  WebUSBKeepKeyAdapter.useKeyring.mockImplementation(() => ({
    initialize: jest.fn(() => Promise.resolve()),
  }))
  // @ts-ignore
  MetaMaskAdapter.useKeyring.mockImplementation(() => ({
    initialize: jest.fn(() => Promise.resolve()),
  }))
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>
      <WalletProvider>{children}</WalletProvider>
    </TestProviders>
  )
  const { result } = renderHook(() => useWallet(), { wrapper })
  // Since there is a dispatch doing async state changes
  // in a useEffect on mount we must wait for that state
  // to finish updating before doing anything else to avoid errors
  await act(() => void 0)
  return result
}

describe('WalletProvider', () => {
  describe('dispatch', () => {
    it('can SET_ADAPTERS on mount', async () => {
      const result = await setup()

      expect(result.current.state.adapters).toBeTruthy()
    })

    it('can SET_WALLET sets a wallet in state', async () => {
      const result = await setup()

      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet: {} as unknown as HDWallet,
            connectedType: KeyManager.Demo,
            ...walletInfoPayload,
          },
        })
      })

      expect(result.current.state.wallet).toBeTruthy()
      expect(result.current.state.walletInfo).toEqual(walletInfoPayload)
    })

    it('can SET_IS_CONNECTED', async () => {
      const result = await setup()

      expect(result.current.state.isConnected).toBe(false)
      act(() => {
        result.current.dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      })
      expect(result.current.state.isConnected).toBe(true)
      act(() => {
        result.current.dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: false })
      })
      expect(result.current.state.isConnected).toBe(false)
    })

    it('can SET_WALLET_MODAL state to open and close', async () => {
      const result = await setup()

      expect(result.current.state.modal).toBe(false)
      act(() => {
        result.current.dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      })
      expect(result.current.state.modal).toBe(true)
      act(() => {
        result.current.dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      })
      expect(result.current.state.modal).toBe(false)
    })
  })

  describe('connect', () => {
    it('dispatches SET_CONNECTOR_TYPE and SET_INITAL_ROUTE', async () => {
      const result = await setup()
      const type = KeyManager.Native
      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)

      act(() => {
        result.current.connect(type)
      })

      expect(result.current.state.modalType).toBe(type)
      expect(result.current.state.initialRoute).toBe(SUPPORTED_WALLETS[type].routes[0].path)
    })
  })

  describe('create', () => {
    it('dispatches SET_CONNECTOR_TYPE and SET_INITAL_ROUTE', async () => {
      const result = await setup()
      const type = KeyManager.Native
      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)

      act(() => {
        result.current.create(type)
      })

      expect(result.current.state.modalType).toBe(type)
      expect(result.current.state.initialRoute).toBe(SUPPORTED_WALLETS[type].routes[5].path)
    })
  })

  describe('disconnect', () => {
    it('disconnects and calls RESET_STATE', async () => {
      const walletDisconnect = jest.fn()
      const result = await setup()

      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)

      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet: { disconnect: walletDisconnect } as unknown as HDWallet,
            connectedType: KeyManager.Demo,
            ...walletInfoPayload,
          },
        })
        result.current.dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      })

      expect(result.current.state.wallet).toBeTruthy()
      expect(result.current.state.walletInfo).toBeTruthy()
      expect(result.current.state.isConnected).toBe(true)

      act(() => {
        result.current.disconnect()
      })

      expect(walletDisconnect).toHaveBeenCalledTimes(1)
      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)
    })
  })
})
