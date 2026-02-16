import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { JsonRpcProvider } from 'ethers'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as monad from './monad/MonadChainAdapter'

vi.mock('ethers', () => {
  class JsonRpcProvider {
    getTransactionReceipt = vi.fn()
    getBalance = vi.fn()
    getTransactionCount = vi.fn()
    estimateGas = vi.fn()
    getFeeData = vi.fn()
    broadcastTransaction = vi.fn()
    send = vi.fn()
  }

  class Contract {
    aggregate3 = vi.fn()
  }

  class Interface {
    encodeFunctionData = vi.fn()
    decodeFunctionResult = vi.fn()
  }

  return {
    Contract,
    Interface,
    JsonRpcProvider,
  }
})

const makeAdapter = () =>
  new monad.ChainAdapter({
    rpcUrl: 'http://localhost',
    getKnownTokens: () => [],
  })

type TransactionStatusAdapter = {
  getTransactionStatus: (txHash: string) => Promise<TxStatus>
}

const getProvider = (adapter: monad.ChainAdapter) =>
  (adapter as unknown as { provider: JsonRpcProvider }).provider

const getTransactionStatus = (adapter: monad.ChainAdapter, txHash: string) =>
  (adapter as unknown as TransactionStatusAdapter).getTransactionStatus(txHash)

describe('SecondClassEvmAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns confirmed when receipt status is 1', async () => {
    const adapter = makeAdapter()
    const provider = getProvider(adapter)

    vi.spyOn(provider, 'getTransactionReceipt').mockResolvedValue({
      status: 1,
    } as unknown as Awaited<ReturnType<JsonRpcProvider['getTransactionReceipt']>>)

    await expect(getTransactionStatus(adapter, '0xabc')).resolves.toBe(TxStatus.Confirmed)
  })

  it('returns failed when receipt status is 0', async () => {
    const adapter = makeAdapter()
    const provider = getProvider(adapter)

    vi.spyOn(provider, 'getTransactionReceipt').mockResolvedValue({
      status: 0,
    } as unknown as Awaited<ReturnType<JsonRpcProvider['getTransactionReceipt']>>)

    await expect(getTransactionStatus(adapter, '0xdef')).resolves.toBe(TxStatus.Failed)
  })

  it('returns pending when receipt is null', async () => {
    const adapter = makeAdapter()
    const provider = getProvider(adapter)

    vi.spyOn(provider, 'getTransactionReceipt').mockResolvedValue(null)

    await expect(getTransactionStatus(adapter, '0x123')).resolves.toBe(TxStatus.Pending)
  })

  it('returns unknown when receipt status is null', async () => {
    const adapter = makeAdapter()
    const provider = getProvider(adapter)

    vi.spyOn(provider, 'getTransactionReceipt').mockResolvedValue({
      status: null,
    } as unknown as Awaited<ReturnType<JsonRpcProvider['getTransactionReceipt']>>)

    await expect(getTransactionStatus(adapter, '0x456')).resolves.toBe(TxStatus.Unknown)
  })

  it('returns unknown when provider throws', async () => {
    const adapter = makeAdapter()
    const provider = getProvider(adapter)

    vi.spyOn(provider, 'getTransactionReceipt').mockRejectedValue(new Error('boom'))

    await expect(getTransactionStatus(adapter, '0x789')).resolves.toBe(TxStatus.Unknown)
  })
})
