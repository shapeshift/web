import { beforeEach, describe, expect, it, vi } from 'vitest'

import { closeModalAfterNetworkSwitch } from '../appkit'

vi.mock('@reown/appkit/react', () => ({ createAppKit: vi.fn(), modal: undefined }))
vi.mock('@reown/appkit-adapter-bitcoin', () => ({ BitcoinAdapter: vi.fn() }))
vi.mock('@reown/appkit-adapter-solana/react', () => ({ SolanaAdapter: vi.fn() }))
vi.mock('@reown/appkit-adapter-wagmi', () => ({ WagmiAdapter: vi.fn() }))
vi.mock('@solana/wallet-adapter-phantom', () => ({ PhantomWalletAdapter: vi.fn() }))
vi.mock('@solana/wallet-adapter-solflare', () => ({ SolflareWalletAdapter: vi.fn() }))

type State = { open: boolean; selectedNetworkId: string | undefined }

const createFakeAppKit = (initial: State) => {
  let state = initial
  let listener: ((state: State) => void) | undefined
  const addresses: Record<string, string | undefined> = {}
  let activeNamespace = 'eip155'

  const appKit = {
    getState: () => state,
    subscribeState: (cb: (state: State) => void) => {
      listener = cb
      return () => undefined
    },
    getActiveChainNamespace: () => activeNamespace,
    getAddressByChainNamespace: (namespace: string) => addresses[namespace],
    close: vi.fn(),
  }

  const emit = (next: Partial<State>, namespace = activeNamespace) => {
    activeNamespace = namespace
    state = { ...state, ...next }
    listener?.(state)
  }

  return { appKit, addresses, emit }
}

describe('closeModalAfterNetworkSwitch', () => {
  let fake: ReturnType<typeof createFakeAppKit>

  beforeEach(() => {
    fake = createFakeAppKit({ open: true, selectedNetworkId: 'eip155:1' })
    fake.addresses.eip155 = '0xabc'
    // Cast: the fake implements only the members the helper uses
    closeModalAfterNetworkSwitch(fake.appKit as never)
  })

  it('closes the modal once it switches to a connected network', () => {
    fake.addresses.solana = 'SoLaddr'
    fake.emit({ selectedNetworkId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' }, 'solana')
    expect(fake.appKit.close).toHaveBeenCalledTimes(1)
  })

  it('closes after an EVM chain switch the wallet approved', () => {
    fake.emit({ selectedNetworkId: 'eip155:42161' })
    expect(fake.appKit.close).toHaveBeenCalledTimes(1)
  })

  it('stays open when the new network has no account, so the user can connect', () => {
    fake.emit({ selectedNetworkId: 'bip122:000000000019d6689c085ae165831e93' }, 'bip122')
    expect(fake.appKit.close).not.toHaveBeenCalled()
  })

  it('ignores state changes that are not a network switch', () => {
    fake.emit({ open: true })
    expect(fake.appKit.close).not.toHaveBeenCalled()
  })

  it('ignores network changes while the modal is closed, e.g. a switch during execution', () => {
    fake.emit({ open: false, selectedNetworkId: 'eip155:42161' })
    expect(fake.appKit.close).not.toHaveBeenCalled()
  })
})
