import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { act, renderHook } from '@testing-library/react-hooks'

import { SUPPORTED_WALLETS } from './config'
import { useWallet, WalletActions, WalletProvider } from './WalletProvider'

jest.mock('@shapeshiftoss/hdwallet-keepkey-webusb', () => ({
  WebUSBKeepKeyAdapter: {
    useKeyring: jest.fn()
  }
}))

const walletInfoPayload = {
  name: SUPPORTED_WALLETS.native.name,
  icon: SUPPORTED_WALLETS.native.icon
}
const setup = async () => {
  // @ts-ignore
  WebUSBKeepKeyAdapter.useKeyring.mockImplementation(() => ({
    initialize: jest.fn(() => Promise.resolve())
  }))
  const wrapper: React.FC = ({ children }) => <WalletProvider>{children}</WalletProvider>
  const hookResult = renderHook(() => useWallet(), { wrapper })
  // Since there is a dispatch doing async state changes
  // in a useEffect on mount we must wait for that state
  // to finish updating before doing anything else to avoid errors
  await hookResult.waitForValueToChange(() => hookResult.result.current.state.adapters)
  return hookResult
}

describe('WalletProvider', () => {
  describe('dispatch', () => {
    it('can SET_ADAPTERS on mount', async () => {
      const { result } = await setup()

      expect(result.current.state.adapters).toBeTruthy()
    })

    it('can SET_WALLET sets a wallet in state', async () => {
      const { result } = await setup()

      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_WALLET,
          payload: {} as unknown as HDWallet
        })
      })

      expect(result.current.state.wallet).toBeTruthy()
    })

    it('can SET_WALLET_INFO', async () => {
      const { result } = await setup()

      expect(result.current.state.walletInfo).toBe(null)
      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_WALLET_INFO,
          payload: walletInfoPayload
        })
      })
      expect(result.current.state.walletInfo).toEqual(walletInfoPayload)
    })

    it('can SET_IS_CONNECTED', async () => {
      const { result } = await setup()

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
      const { result } = await setup()

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

  describe('disconnect', () => {
    it('disconnects and calls RESET_STATE', async () => {
      const walletDisconnect = jest.fn()
      const { result } = await setup()

      expect(result.current.state.wallet).toBe(null)
      expect(result.current.state.walletInfo).toBe(null)
      expect(result.current.state.isConnected).toBe(false)

      act(() => {
        result.current.dispatch({
          type: WalletActions.SET_WALLET,
          payload: { disconnect: walletDisconnect } as unknown as HDWallet
        })
        result.current.dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        result.current.dispatch({
          type: WalletActions.SET_WALLET_INFO,
          payload: walletInfoPayload
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
