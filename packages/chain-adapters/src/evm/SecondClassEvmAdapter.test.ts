import { TxStatus } from '@shapeshiftoss/unchained-client'
import { TransactionReceiptNotFoundError } from 'viem'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as monad from './monad/MonadChainAdapter'

const mockViemClient = {
  getTransactionReceipt: vi.fn(),
  getBalance: vi.fn(),
  getTransactionCount: vi.fn(),
  estimateGas: vi.fn(),
  getGasPrice: vi.fn(),
  estimateFeesPerGas: vi.fn(),
  sendRawTransaction: vi.fn(),
  request: vi.fn(),
  multicall: vi.fn(),
  readContract: vi.fn(),
  getTransaction: vi.fn(),
  getBlock: vi.fn(),
  getBlockNumber: vi.fn(),
}

vi.mock('@shapeshiftoss/contracts', () => ({
  MULTICALL3_CONTRACT: '0xcA11bde05977b3631167028862bE2a173976CA11',
  viemClientByChainId: new Proxy(
    {},
    {
      get: () => mockViemClient,
    },
  ),
}))

const makeAdapter = () =>
  new monad.ChainAdapter({
    rpcUrl: 'http://localhost',
    getKnownTokens: () => [],
  })

describe('SecondClassEvmAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns confirmed when receipt status is success', async () => {
    const adapter = makeAdapter()

    vi.spyOn(mockViemClient, 'getTransactionReceipt').mockResolvedValue({ status: 'success' })

    await expect(adapter.getTransactionStatus('0xabc')).resolves.toBe(TxStatus.Confirmed)
  })

  it('returns failed when receipt status is reverted', async () => {
    const adapter = makeAdapter()

    vi.spyOn(mockViemClient, 'getTransactionReceipt').mockResolvedValue({ status: 'reverted' })

    await expect(adapter.getTransactionStatus('0xdef')).resolves.toBe(TxStatus.Failed)
  })

  it('returns pending when receipt is not found', async () => {
    const adapter = makeAdapter()

    vi.spyOn(mockViemClient, 'getTransactionReceipt').mockRejectedValue(
      new TransactionReceiptNotFoundError({ hash: '0x123' }),
    )

    await expect(adapter.getTransactionStatus('0x123')).resolves.toBe(TxStatus.Pending)
  })

  it('returns unknown when provider throws an unexpected error', async () => {
    const adapter = makeAdapter()

    vi.spyOn(mockViemClient, 'getTransactionReceipt').mockRejectedValue(new Error('boom'))

    await expect(adapter.getTransactionStatus('0x789')).resolves.toBe(TxStatus.Unknown)
  })
})
