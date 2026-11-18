import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activateNamespace, getNamespaceForChainId } from '../appkit'

const mockModal = vi.hoisted(() => ({
  getActiveChainNamespace: vi.fn(),
  getCaipNetworks: vi.fn(),
  switchNetwork: vi.fn(),
}))

vi.mock('@reown/appkit/react', () => ({ createAppKit: vi.fn(), modal: mockModal }))
vi.mock('@reown/appkit-adapter-bitcoin', () => ({ BitcoinAdapter: vi.fn() }))
vi.mock('@reown/appkit-adapter-solana/react', () => ({ SolanaAdapter: vi.fn() }))
vi.mock('@reown/appkit-adapter-wagmi', () => ({ WagmiAdapter: vi.fn() }))
vi.mock('@solana/wallet-adapter-phantom', () => ({ PhantomWalletAdapter: vi.fn() }))
vi.mock('@solana/wallet-adapter-solflare', () => ({ SolflareWalletAdapter: vi.fn() }))

const BTC_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93'
const btcNetwork = { id: 'btc', caipNetworkId: BTC_CHAIN_ID }
const ethNetwork = { id: 1, caipNetworkId: 'eip155:1' }
const arbNetwork = { id: 42161, caipNetworkId: 'eip155:42161' }

describe('activateNamespace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModal.switchNetwork.mockResolvedValue(undefined)
  })

  it('does nothing when the namespace is already active', async () => {
    mockModal.getActiveChainNamespace.mockReturnValue('bip122')
    await activateNamespace('bip122', BTC_CHAIN_ID)
    expect(mockModal.switchNetwork).not.toHaveBeenCalled()
  })

  it('switches to the network matching the sell chain', async () => {
    mockModal.getActiveChainNamespace.mockReturnValue('solana')
    mockModal.getCaipNetworks.mockReturnValue([ethNetwork, arbNetwork])
    await activateNamespace('eip155', 'eip155:42161')
    expect(mockModal.getCaipNetworks).toHaveBeenCalledWith('eip155')
    expect(mockModal.switchNetwork).toHaveBeenCalledWith(arbNetwork)
  })

  it("falls back to the namespace's first network when the sell chain isn't registered", async () => {
    mockModal.getActiveChainNamespace.mockReturnValue('solana')
    mockModal.getCaipNetworks.mockReturnValue([ethNetwork])
    await activateNamespace('eip155', 'eip155:42161')
    expect(mockModal.switchNetwork).toHaveBeenCalledWith(ethNetwork)
  })

  it('does nothing when AppKit has no network for the namespace', async () => {
    mockModal.getActiveChainNamespace.mockReturnValue('eip155')
    mockModal.getCaipNetworks.mockReturnValue([])
    await activateNamespace('bip122', BTC_CHAIN_ID)
    expect(mockModal.switchNetwork).not.toHaveBeenCalled()
  })

  it('switches between namespaces for bitcoin', async () => {
    mockModal.getActiveChainNamespace.mockReturnValue('eip155')
    mockModal.getCaipNetworks.mockReturnValue([btcNetwork])
    await activateNamespace('bip122', BTC_CHAIN_ID)
    expect(mockModal.switchNetwork).toHaveBeenCalledWith(btcNetwork)
  })
})

describe('getNamespaceForChainId', () => {
  it('maps each signable chain type to its AppKit namespace', () => {
    expect(getNamespaceForChainId('eip155:42161')).toBe('eip155')
    expect(getNamespaceForChainId(BTC_CHAIN_ID)).toBe('bip122')
    expect(getNamespaceForChainId('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe('solana')
  })

  it('has no namespace for chains the widget cannot sign for', () => {
    expect(getNamespaceForChainId('cosmos:cosmoshub-4')).toBeUndefined()
  })
})
