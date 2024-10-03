import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { TestProviders } from 'test/TestProviders'
import { describe, expect, it, vi } from 'vitest'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import { WalletProvider } from './WalletProvider'

vi.mock('@shapeshiftoss/hdwallet-keepkey-webusb', () => ({
  WebUSBKeepKeyAdapter: {
    useKeyring: vi.fn(),
  },
}))

vi.mock('@shapeshiftoss/hdwallet-ledger-webusb', () => ({
  WebUSBLedgerAdapter: {
    useKeyring: vi.fn(),
  },
}))

vi.mock('friendly-challenge', () => ({
  WidgetInstance: {},
}))

vi.mock('@shapeshiftoss/hdwallet-metamask-multichain', () => ({
  MetaMaskAdapter: {
    useKeyring: vi.fn(),
  },
}))

const walletInfoPayload = {
  name: SUPPORTED_WALLETS.native.name,
  icon: SUPPORTED_WALLETS.native.icon,
  deviceId: '',
  meta: { label: '', address: '' },
}
const setup = () => {
  // @ts-ignore
  WebUSBKeepKeyAdapter.useKeyring.mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve()),
  }))
  // @ts-ignore
  MetaMaskAdapter.useKeyring.mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve()),
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
  act(() => void 0)
  return result
}

describe('WalletProvider', () => {
  describe('dispatch', () => {
    it('can SET_WALLET sets a wallet in state', () => {
      const result = setup()

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

    it('can SET_IS_CONNECTED', () => {
      const result = setup()

      expect(result.current.state.isConnected).toBe(false)
      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: true, modalType: '' },
        })
      })
      expect(result.current.state.isConnected).toBe(true)
      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: false, modalType: '' },
        })
      })
      expect(result.current.state.isConnected).toBe(false)
    })

    it('can SET_WALLET_MODAL state to open and close', () => {
      const result = setup()

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
    it('dispatches SET_CONNECTOR_TYPE and SET_INITAL_ROUTE', () => {
      const result = setup()
      const type = KeyManager.Native
      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)

      act(() => {
        result.current.connect(type, false)
      })

      expect(result.current.state.modalType).toBe(type)
      expect(result.current.state.initialRoute).toBe(SUPPORTED_WALLETS[type].routes[0].path)
    })
  })

  describe('create', () => {
    it('dispatches SET_CONNECTOR_TYPE and SET_INITAL_ROUTE', () => {
      const result = setup()
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
    it('disconnects and calls RESET_STATE', () => {
      const walletDisconnect = vi.fn()
      const result = setup()

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
        result.current.dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: { isConnected: true, modalType: '' },
        })
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
