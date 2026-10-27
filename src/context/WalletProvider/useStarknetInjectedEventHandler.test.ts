import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WalletActions } from './actions'
import { KeyManager } from './KeyManager'
import { useStarknetInjectedEventHandler } from './useStarknetInjectedEventHandler'
import type { IWalletContext } from './WalletContext'

import { localWalletSlice } from '@/state/slices/localWalletSlice/localWalletSlice'
import { selectWalletDeviceId } from '@/state/slices/localWalletSlice/selectors'
import { store } from '@/state/store'

const CURRENT_DEVICE_ID = 'braavos:0xaaa'
const NEXT_DEVICE_ID = 'braavos:0xbbb'

type Handler = (...args: unknown[]) => void

const makeProvider = () => {
  const handlers: Record<string, Handler | undefined> = {}
  return {
    handlers,
    on: vi.fn((event: string, handler: Handler) => (handlers[event] = handler)),
    off: vi.fn((event: string, handler: Handler) => {
      if (handlers[event] === handler) handlers[event] = undefined
    }),
  }
}

const setup = ({
  nextDeviceId,
  isMainnet = true,
}: {
  nextDeviceId: string | undefined
  isMainnet?: boolean
}) => {
  const provider = makeProvider()
  const wallet = {
    _isStarknetInjected: true,
    provider,
    isMainnet: vi.fn().mockResolvedValue(isMainnet),
  }
  const nextWallet = nextDeviceId
    ? { _isStarknetInjected: true, provider, getDeviceID: () => Promise.resolve(nextDeviceId) }
    : undefined
  const pairDevice = vi.fn().mockResolvedValue(nextWallet)
  const getAdapter = vi.fn().mockResolvedValue({ pairDevice })
  const dispatch = vi.fn()

  const state = {
    wallet,
    connectedType: KeyManager.Braavos,
    deviceId: CURRENT_DEVICE_ID,
  } as unknown as IWalletContext['state']

  const { unmount } = renderHook(() =>
    useStarknetInjectedEventHandler({
      state,
      getAdapter: getAdapter as unknown as IWalletContext['getAdapter'],
      dispatch,
    }),
  )

  return { wallet, provider, nextWallet, pairDevice, dispatch, unmount }
}

const dispatchedTypes = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.map(([action]) => action.type)

describe('useStarknetInjectedEventHandler', () => {
  beforeEach(() => {
    store.dispatch(
      localWalletSlice.actions.setLocalWallet({
        type: KeyManager.Braavos,
        deviceId: CURRENT_DEVICE_ID,
        rdns: null,
      }),
    )
  })

  afterEach(() => {
    cleanup()
    store.dispatch(localWalletSlice.actions.clearLocalWallet())
  })

  it('switches to the new account silently when the user changes account in the extension', async () => {
    const { provider, nextWallet, pairDevice, dispatch } = setup({ nextDeviceId: NEXT_DEVICE_ID })

    provider.handlers.accountsChanged?.(['0xbbb'])

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WalletActions.SET_WALLET,
          payload: expect.objectContaining({
            wallet: nextWallet,
            deviceId: NEXT_DEVICE_ID,
            connectedType: KeyManager.Braavos,
          }),
        }),
      ),
    )
    // Never prompts
    expect(pairDevice).toHaveBeenCalledWith(true)
    expect(dispatch).toHaveBeenCalledWith({ type: WalletActions.SET_IS_LOCKED, payload: false })
    // Persisted so a reload restores the right account
    expect(selectWalletDeviceId(store.getState())).toBe(NEXT_DEVICE_ID)
  })

  it('refreshes the account on network change', async () => {
    const { provider, dispatch } = setup({ nextDeviceId: NEXT_DEVICE_ID })

    provider.handlers.networkChanged?.('0x534e5f5345504f4c4941', ['0xbbb'])

    await waitFor(() => expect(dispatchedTypes(dispatch)).toContain(WalletActions.SET_WALLET))
  })

  it('ignores the account selected on another network', async () => {
    const { wallet, provider, pairDevice, dispatch } = setup({
      nextDeviceId: NEXT_DEVICE_ID,
      isMainnet: false,
    })

    provider.handlers.networkChanged?.('0x534e5f5345504f4c4941', ['0xbbb'])

    await waitFor(() => expect(wallet.isMainnet).toHaveBeenCalled())
    expect(pairDevice).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(selectWalletDeviceId(store.getState())).toBe(CURRENT_DEVICE_ID)
  })

  it('only applies the latest of overlapping refreshes', async () => {
    const { provider, pairDevice, dispatch } = setup({ nextDeviceId: NEXT_DEVICE_ID })
    const staleWallet = {
      _isStarknetInjected: true,
      provider,
      getDeviceID: () => Promise.resolve('braavos:0xstale'),
    }
    let resolveStale: (wallet: unknown) => void = () => {}
    pairDevice.mockImplementationOnce(() => new Promise(resolve => (resolveStale = resolve)))

    provider.handlers.accountsChanged?.(['0xstale'])
    await waitFor(() => expect(pairDevice).toHaveBeenCalledTimes(1))
    provider.handlers.accountsChanged?.(['0xbbb'])
    await waitFor(() => expect(selectWalletDeviceId(store.getState())).toBe(NEXT_DEVICE_ID))

    // The earlier, slower refresh resolves last and must not win
    resolveStale(staleWallet)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(selectWalletDeviceId(store.getState())).toBe(NEXT_DEVICE_ID)
    const walletDispatches = dispatch.mock.calls.filter(
      ([action]) => action.type === WalletActions.SET_WALLET,
    )
    expect(walletDispatches).toHaveLength(1)
  })

  it('does not reload anything when the account is unchanged', async () => {
    const { provider, pairDevice, dispatch } = setup({ nextDeviceId: CURRENT_DEVICE_ID })

    provider.handlers.networkChanged?.('0x534e5f4d41494e', ['0xaaa'])

    await waitFor(() => expect(pairDevice).toHaveBeenCalled())
    await waitFor(() => expect(dispatchedTypes(dispatch)).toContain(WalletActions.SET_IS_LOCKED))
    expect(dispatchedTypes(dispatch)).not.toContain(WalletActions.SET_WALLET)
  })

  it('marks the wallet locked when the extension reports no accounts', () => {
    const { provider, pairDevice, dispatch } = setup({ nextDeviceId: NEXT_DEVICE_ID })

    provider.handlers.accountsChanged?.([])

    expect(dispatch).toHaveBeenCalledWith({ type: WalletActions.SET_IS_LOCKED, payload: true })
    expect(pairDevice).not.toHaveBeenCalled()
  })

  it('marks the wallet locked when the new account cannot be restored silently', async () => {
    const { provider, dispatch } = setup({ nextDeviceId: undefined })

    provider.handlers.accountsChanged?.(['0xbbb'])

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: WalletActions.SET_IS_LOCKED, payload: true }),
    )
    expect(dispatchedTypes(dispatch)).not.toContain(WalletActions.SET_WALLET)
  })

  it('ignores events once another wallet is connected', async () => {
    const { provider, pairDevice, dispatch } = setup({ nextDeviceId: NEXT_DEVICE_ID })
    store.dispatch(
      localWalletSlice.actions.setLocalWallet({
        type: KeyManager.Native,
        deviceId: 'native-id',
        rdns: null,
      }),
    )

    provider.handlers.accountsChanged?.(['0xbbb'])

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(pairDevice).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('detaches its listeners on unmount', () => {
    const { provider, unmount } = setup({ nextDeviceId: NEXT_DEVICE_ID })

    unmount()

    expect(provider.handlers.accountsChanged).toBeUndefined()
    expect(provider.handlers.networkChanged).toBeUndefined()
  })
})
