// @vitest-environment jsdom
import * as core from '@shapeshiftoss/hdwallet-core'
import type { StarknetWindowObject } from '@starknet-io/types-js'
import { constants } from 'starknet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BraavosAdapter } from '.'

const MAINNET_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000aaa'
const SEPOLIA_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000bbb'

describe('StarknetInjectedAdapter', () => {
  let request: ReturnType<typeof vi.fn>
  let adapter: BraavosAdapter

  beforeEach(() => {
    request = vi.fn()
    window.starknet_braavos = {
      id: 'braavos',
      name: 'Braavos',
      version: '4.0.0',
      icon: '',
      request,
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as StarknetWindowObject

    adapter = BraavosAdapter.useKeyring(new core.Keyring())
  })

  afterEach(() => {
    delete window.starknet_braavos
  })

  it('restores without asking to switch network, letting a locked extension prompt an unlock', async () => {
    request.mockResolvedValueOnce([SEPOLIA_ADDRESS])

    const wallet = await adapter.pairDevice('restore')

    expect(await wallet?.getDeviceID()).toBe(`braavos:${SEPOLIA_ADDRESS}`)
    expect(request.mock.calls).toEqual([
      [{ type: 'wallet_requestAccounts', params: { silent_mode: false } }],
    ])
  })

  it('refreshes silently', async () => {
    request.mockResolvedValueOnce([MAINNET_ADDRESS])

    await adapter.pairDevice('refresh')

    expect(request.mock.calls).toEqual([
      [{ type: 'wallet_requestAccounts', params: { silent_mode: true } }],
    ])
  })

  it('returns undefined on restore when the site is no longer authorized', async () => {
    request.mockResolvedValueOnce([])
    expect(await adapter.pairDevice('restore')).toBeUndefined()
  })

  it('returns undefined on restore when the extension is gone', async () => {
    delete window.starknet_braavos
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)

    expect(await adapter.pairDevice('restore')).toBeUndefined()
    expect(open).not.toHaveBeenCalled()
  })

  it('waits for an extension that injects after the app starts restoring', async () => {
    const provider = window.starknet_braavos
    delete window.starknet_braavos
    setTimeout(() => (window.starknet_braavos = provider), 200)
    request.mockResolvedValueOnce([MAINNET_ADDRESS])

    const wallet = await adapter.pairDevice('restore')

    expect(await wallet?.getDeviceID()).toBe(`braavos:${MAINNET_ADDRESS}`)
  })

  it('replaces the previous account in the keyring instead of piling them up', async () => {
    const keyring = new core.Keyring()
    adapter = BraavosAdapter.useKeyring(keyring)
    request.mockResolvedValueOnce([MAINNET_ADDRESS]).mockResolvedValueOnce([SEPOLIA_ADDRESS])

    await adapter.pairDevice('refresh')
    await adapter.pairDevice('refresh')

    expect(Object.keys(keyring.wallets)).toEqual([`braavos:${SEPOLIA_ADDRESS}`])
  })

  it('reports a missing extension with a code the app can translate', async () => {
    delete window.starknet_braavos
    vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(adapter.pairDevice()).rejects.toMatchObject({ code: 'PROVIDER_NOT_FOUND' })
  })

  it('switches to mainnet on connect and uses the mainnet account', async () => {
    request
      .mockResolvedValueOnce([SEPOLIA_ADDRESS])
      .mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce([MAINNET_ADDRESS])

    const wallet = await adapter.pairDevice()

    expect(await wallet?.getDeviceID()).toBe(`braavos:${MAINNET_ADDRESS}`)
  })

  it('fails to connect when the user refuses to switch to mainnet', async () => {
    request
      .mockResolvedValueOnce([SEPOLIA_ADDRESS])
      .mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)
      .mockResolvedValueOnce(false)

    await expect(adapter.pairDevice()).rejects.toMatchObject({ code: 'WRONG_NETWORK' })
  })

  it('fails to connect when the extension throws on the mainnet switch', async () => {
    request
      .mockResolvedValueOnce([SEPOLIA_ADDRESS])
      .mockResolvedValueOnce(constants.StarknetChainId.SN_SEPOLIA)
      .mockRejectedValueOnce(new Error('User refused'))

    await expect(adapter.pairDevice()).rejects.toMatchObject({ code: 'WRONG_NETWORK' })
  })
})
