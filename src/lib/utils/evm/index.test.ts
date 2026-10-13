import type { EvmChainAdapter, SignTx } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { EvmChainId } from '@shapeshiftoss/types'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { signAndBroadcast } from './index'

const deadline = 1791934983000

const setup = (offlineSigning: boolean) => {
  const adapter = {
    signTransaction: vi.fn(() => {
      vi.setSystemTime(deadline + 1)
      return Promise.resolve('0xsigned')
    }),
    broadcastTransaction: vi.fn(),
    signAndBroadcastTransaction: vi.fn(),
  }
  const wallet = {
    supportsOfflineSigning: () => offlineSigning,
    supportsBroadcast: () => !offlineSigning,
  }
  const args = {
    adapter: adapter as unknown as EvmChainAdapter,
    wallet: wallet as unknown as HDWallet,
    txToSign: {} as SignTx<EvmChainId>,
    senderAddress: '0x1111111111111111111111111111111111111111',
    receiverAddress: '0x1111111111111111111111111111111111111111',
    beforeBroadcast: () => {
      if (Date.now() > deadline) throw new Error('Quote expired')
    },
  }
  return { adapter, args }
}

describe('signAndBroadcast quote expiry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not broadcast an offline-signed transaction that expires during signing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(deadline - 1)
    const { adapter, args } = setup(true)

    await expect(signAndBroadcast(args)).rejects.toThrow('Quote expired')

    expect(adapter.signTransaction).toHaveBeenCalledOnce()
    expect(adapter.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('rejects an expired quote before a bundled wallet is called', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(deadline + 1)
    const { adapter, args } = setup(false)

    await expect(signAndBroadcast(args)).rejects.toThrow('Quote expired')

    expect(adapter.signAndBroadcastTransaction).not.toHaveBeenCalled()
  })

  it('allows a valid quote to reach a bundled wallet', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(deadline - 1)
    const { adapter, args } = setup(false)
    adapter.signAndBroadcastTransaction.mockResolvedValue('0xtxid')

    await expect(signAndBroadcast(args)).resolves.toBe('0xtxid')

    expect(adapter.signAndBroadcastTransaction).toHaveBeenCalledOnce()
  })
})
