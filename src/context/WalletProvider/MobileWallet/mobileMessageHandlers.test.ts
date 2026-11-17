import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteWallet, hasNativeDeleteConfirmation, listWallets } from './mobileMessageHandlers'

describe('mobileMessageHandlers', () => {
  const nativePostMessage = vi.fn<(msg: string) => void>()

  beforeEach(() => {
    vi.useFakeTimers()
    nativePostMessage.mockReset()
    window.ReactNativeWebView = { postMessage: nativePostMessage }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.ReactNativeWebView
    delete window.shapeshiftMobileCapabilities
  })

  it('waits for the native delete confirmation beyond the default timeout', async () => {
    const deleted = deleteWallet('wallet-id')
    const settled = vi.fn()
    deleted.then(settled, settled)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(settled).not.toHaveBeenCalled()

    const { id } = JSON.parse(nativePostMessage.mock.calls[0][0])
    window.dispatchEvent(new MessageEvent('message', { data: { id, result: false } }))
    await expect(deleted).resolves.toBe(false)
  })

  it('keeps the default timeout for other commands', async () => {
    const wallets = listWallets().catch((e: Error) => e.message)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await wallets).toBe('PostMessage listWallets timed out')
  })

  it('only trusts the exact native delete confirmation flag', () => {
    expect(hasNativeDeleteConfirmation()).toBe(false)
    window.shapeshiftMobileCapabilities = { nativeDeleteConfirmation: 'true' as unknown as boolean }
    expect(hasNativeDeleteConfirmation()).toBe(false)
    window.shapeshiftMobileCapabilities = { nativeDeleteConfirmation: true }
    expect(hasNativeDeleteConfirmation()).toBe(true)
  })
})
