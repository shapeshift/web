import { act, renderHook } from '@testing-library/react-hooks'

import * as config from './config'
import { useWallet, WalletActions, WalletProvider } from './WalletProvider'

jest.mock('./config')

const setup = () => {
  // @ts-ignore
  config.SUPPORTED_WALLETS = { native: config.SUPPORTED_WALLETS.native }
  const wrapper: React.FC = ({ children }) => <WalletProvider>{children}</WalletProvider>
  return renderHook(() => useWallet(), { wrapper })
}

describe('WalletProvider', () => {
  describe('dispatch', () => {
    it('can set modal state to open and close', () => {
      const { result } = setup()
      console.info(result)
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

    it('can set wallet isConnected', () => {
      const { result } = setup()
      console.info(result)
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
  })
})
