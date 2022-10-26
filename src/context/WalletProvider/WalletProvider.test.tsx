import { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { TestProviders } from 'test/TestProviders'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

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

// This mock fixes an issue with rendering the OptInModal in WalletViewsSwitch
// when the Pendo plugin is disabled
jest.mock('./WalletViewsRouter', () => ({
  WalletViewsRouter: () => null,
}))

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
  await act(async () => void 0)
  return result
}

describe('WalletProvider', () => {
  describe('dispatch', () => {
    it('can SET_ADAPTERS on mount', async () => {
      const result = await setup()

      expect(result.current.state.adapters).toBeTruthy()
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
})
