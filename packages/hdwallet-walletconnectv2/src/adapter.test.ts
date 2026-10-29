import type { Keyring } from '@shapeshiftoss/hdwallet-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WalletConnectV2Adapter } from './adapter'

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  initialize: vi.fn(),
  getDeviceID: vi.fn(),
}))
vi.mock('@walletconnect/ethereum-provider', () => ({
  EthereumProvider: { init: mocks.init },
}))
vi.mock('./walletconnectV2', () => ({
  WalletConnectV2HDWallet: class {
    constructor(public provider: unknown) {}
    initialize = mocks.initialize
    getDeviceID = mocks.getDeviceID
    disconnect = vi.fn()
  },
}))

const deferred = () => {
  const callbacks = {
    resolve: () => {},
    reject: (reason: Error) => {
      throw reason
    },
  }
  const promise = new Promise<void>((resolve, reject) =>
    Object.assign(callbacks, { resolve, reject }),
  )
  return { promise, ...callbacks }
}

const setup = () => {
  const listeners = new Map<string, (uri: string) => void>()
  const provider = {
    session: undefined as { topic: string } | undefined,
    disconnect: vi.fn(async () => {
      provider.session = undefined
    }),
    on: vi.fn((event: string, listener: (uri: string) => void) => listeners.set(event, listener)),
    removeListener: vi.fn((event: string) => listeners.delete(event)),
    signer: {
      client: {
        disconnect: vi.fn().mockResolvedValue(undefined),
        core: { pairing: { disconnect: vi.fn().mockResolvedValue(undefined) } },
      },
    },
  }
  const keyring = { wallets: {}, add: vi.fn(), emit: vi.fn() }
  const config = {
    projectId: 'test-project',
    chains: [1] as [number],
    showQrModal: true,
  }
  const { useKeyring: createAdapter } = WalletConnectV2Adapter
  const adapter = createAdapter(keyring as unknown as Keyring, config)
  mocks.init.mockResolvedValue(provider)
  mocks.getDeviceID.mockResolvedValue('test-device')
  return { provider, keyring, adapter, config, listeners }
}

beforeEach(() => vi.resetAllMocks())

describe('WalletConnect direct pairing', () => {
  it('leaves the generic modal path and configuration unchanged', async () => {
    const { adapter, config, keyring } = setup()
    await adapter.pairDevice()
    expect(mocks.init).toHaveBeenCalledWith(config)
    expect(keyring.add).toHaveBeenCalledOnce()
    expect(keyring.emit).toHaveBeenCalledOnce()
  })

  it('delivers the exact URI and registers an approved wallet through the existing keyring', async () => {
    const { adapter, keyring, listeners, config } = setup()
    const approval = deferred()
    mocks.initialize.mockReturnValue(approval.promise)
    const onDisplayUri = vi.fn()
    const pending = adapter.pairDevice({
      signal: new AbortController().signal,
      onDisplayUri,
    })
    await vi.waitFor(() => expect(listeners.has('display_uri')).toBe(true))
    listeners.get('display_uri')?.('wc:test-pairing@2?relay-protocol=irn&symKey=test')
    expect(onDisplayUri).toHaveBeenCalledWith('wc:test-pairing@2?relay-protocol=irn&symKey=test')
    expect(mocks.init).toHaveBeenCalledWith({ ...config, showQrModal: false })
    approval.resolve()
    await pending
    expect(keyring.add).toHaveBeenCalledOnce()
    expect(listeners.size).toBe(0)
  })

  it('does not initialize a provider for an already cancelled attempt', async () => {
    const { adapter } = setup()
    const signal = AbortSignal.abort()
    await expect(adapter.pairDevice({ signal, onDisplayUri: vi.fn() })).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(mocks.init).not.toHaveBeenCalled()
  })

  it('cancels only its emitted pairing and never registers a late approval', async () => {
    const { adapter, provider, keyring, listeners } = setup()
    const approval = deferred()
    mocks.initialize.mockReturnValue(approval.promise)
    const controller = new AbortController()
    const pending = adapter.pairDevice({
      signal: controller.signal,
      onDisplayUri: vi.fn(),
    })
    const rejected = pending.catch(error => error)
    await vi.waitFor(() => expect(listeners.has('display_uri')).toBe(true))
    listeners.get('display_uri')?.('wc:own-pairing@2?relay-protocol=irn&symKey=test')
    controller.abort()
    expect(await rejected).toMatchObject({ name: 'AbortError' })
    expect(provider.signer.client.core.pairing.disconnect).toHaveBeenCalledWith({
      topic: 'own-pairing',
    })
    provider.session = { topic: 'late-session' }
    approval.resolve()
    await vi.waitFor(() =>
      expect(provider.signer.client.disconnect).toHaveBeenCalledWith({
        topic: 'late-session',
        reason: { code: 6000, message: 'Wallet connection cancelled' },
      }),
    )
    expect(keyring.add).not.toHaveBeenCalled()
    expect(keyring.emit).not.toHaveBeenCalled()
    expect(listeners.size).toBe(0)
  })

  it('cleans up a URI emitted after cancellation without displaying it', async () => {
    const { adapter, provider, listeners } = setup()
    const approval = deferred()
    mocks.initialize.mockReturnValue(approval.promise)
    const controller = new AbortController()
    const onDisplayUri = vi.fn()
    const pending = adapter.pairDevice({
      signal: controller.signal,
      onDisplayUri,
    })
    const rejected = pending.catch(error => error)
    await vi.waitFor(() => expect(listeners.has('display_uri')).toBe(true))
    controller.abort()
    expect(await rejected).toMatchObject({ name: 'AbortError' })
    listeners.get('display_uri')?.('wc:late-pairing@2?relay-protocol=irn&symKey=test')
    expect(onDisplayUri).not.toHaveBeenCalled()
    expect(provider.signer.client.core.pairing.disconnect).toHaveBeenCalledWith({
      topic: 'late-pairing',
    })
    approval.reject(new Error('cancelled'))
    await vi.waitFor(() => expect(listeners.size).toBe(0))
  })

  it('surfaces rejection and allows a fresh retry', async () => {
    const { adapter, keyring } = setup()
    mocks.initialize.mockRejectedValueOnce(new Error('Rejected')).mockResolvedValueOnce(undefined)
    await expect(
      adapter.pairDevice({
        signal: new AbortController().signal,
        onDisplayUri: vi.fn(),
      }),
    ).rejects.toThrow('Rejected')
    expect(keyring.add).not.toHaveBeenCalled()
    await adapter.pairDevice({
      signal: new AbortController().signal,
      onDisplayUri: vi.fn(),
    })
    expect(keyring.add).toHaveBeenCalledOnce()
  })
})
