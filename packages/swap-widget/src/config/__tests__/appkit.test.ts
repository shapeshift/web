import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initializeAppKit } from '../appkit'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@reown/appkit/react', () => ({
  modal: undefined,
  createAppKit: mocks.create,
}))
vi.mock('@reown/appkit-adapter-wagmi', () => ({
  WagmiAdapter: class {
    wagmiConfig = {}
  },
}))
vi.mock('@reown/appkit-adapter-bitcoin', () => ({ BitcoinAdapter: class {} }))
vi.mock('@reown/appkit-adapter-solana/react', () => ({ SolanaAdapter: class {} }))
vi.mock('@solana/wallet-adapter-phantom', () => ({ PhantomWalletAdapter: class {} }))
vi.mock('@solana/wallet-adapter-solflare', () => ({ SolflareWalletAdapter: class {} }))
vi.mock('../walletInitiatedConnect', () => ({ guardWalletInitiatedConnects: vi.fn() }))

beforeEach(() => {
  mocks.create.mockClear()
  mocks.create.mockReturnValue({ getState: () => ({}), subscribeState: vi.fn() })
})

describe('AppKit network artwork', () => {
  it('provides distinct network images for chains without built-in Reown icons', () => {
    initializeAppKit('test-project')
    const options = mocks.create.mock.calls[0][0]
    for (const id of [143, 4326, 999, 9745, 747474]) {
      expect(options.networks.some((network: { id: number }) => network.id === id)).toBe(true)
      expect(options.chainImages?.[id]).toMatch(/^https:\/\//)
    }
    expect(options.chainImages[4326]).not.toBe(options.chainImages[1])
    expect(options.chainImages[747474]).not.toBe(options.chainImages[1])
  })
})
