import type { StarknetInjectedHDWallet } from '@shapeshiftoss/hdwallet-starknet-injected'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StarknetWrongNetworkButton } from './StarknetWrongNetworkButton'

import { TestProviders } from '@/test/TestProviders'

type Handler = () => void

const setup = (isMainnet: boolean) => {
  const handlers: Record<string, Handler | undefined> = {}
  const wallet = {
    provider: {
      on: vi.fn((event: string, handler: Handler) => (handlers[event] = handler)),
      off: vi.fn((event: string) => (handlers[event] = undefined)),
    },
    getVendor: () => 'Braavos',
    isMainnet: vi.fn().mockResolvedValue(isMainnet),
    ensureMainnet: vi.fn().mockResolvedValue(true),
  }

  const { unmount } = render(
    <TestProviders>
      <StarknetWrongNetworkButton wallet={wallet as unknown as StarknetInjectedHDWallet} />
    </TestProviders>,
  )

  return { wallet, handlers, unmount }
}

describe('StarknetWrongNetworkButton', () => {
  afterEach(cleanup)

  it('renders nothing on mainnet', async () => {
    const { wallet } = setup(true)

    await waitFor(() => expect(wallet.isMainnet).toHaveBeenCalled())
    expect(screen.queryByText('Wrong Network')).toBeNull()
  })

  it('warns when the extension is on another network', async () => {
    setup(false)

    expect(await screen.findByText('Wrong Network')).toBeTruthy()
  })

  it('appears and disappears as the user switches network in the extension', async () => {
    const { wallet, handlers } = setup(true)
    await waitFor(() => expect(handlers.networkChanged).toBeDefined())

    wallet.isMainnet.mockResolvedValue(false)
    act(() => handlers.networkChanged?.())
    expect(await screen.findByText('Wrong Network')).toBeTruthy()

    wallet.isMainnet.mockResolvedValue(true)
    act(() => handlers.networkChanged?.())
    await waitFor(() => expect(screen.queryByText('Wrong Network')).toBeNull())
  })

  it('asks the extension to switch back on click', async () => {
    const { wallet } = setup(false)

    const button = await screen.findByText('Wrong Network')
    wallet.isMainnet.mockResolvedValue(true)
    fireEvent.click(button)

    await waitFor(() => expect(wallet.ensureMainnet).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Wrong Network')).toBeNull())
  })

  it('keeps warning when the user refuses to switch', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { wallet } = setup(false)
    wallet.ensureMainnet.mockRejectedValue(new Error('must be set to Starknet Mainnet'))

    fireEvent.click(await screen.findByText('Wrong Network'))

    await waitFor(() => expect(wallet.ensureMainnet).toHaveBeenCalled())
    expect(await screen.findByText('Wrong Network')).toBeTruthy()
  })

  it('stops listening on unmount', async () => {
    const { handlers, unmount } = setup(true)
    await waitFor(() => expect(handlers.networkChanged).toBeDefined())

    unmount()

    expect(handlers.networkChanged).toBeUndefined()
  })
})
