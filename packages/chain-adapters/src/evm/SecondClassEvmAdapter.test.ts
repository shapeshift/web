import { TxStatus } from '@shapeshiftoss/unchained-client'
import { TransactionReceiptNotFoundError } from 'viem'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as monad from './monad/MonadChainAdapter'
import type { TokenInfo } from './SecondClassEvmAdapter'

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

const mockViemClient = {
  chain: { contracts: { multicall3: { address: MULTICALL3_ADDRESS } } },
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

const FOO_TOKEN: TokenInfo = {
  assetId: 'eip155:143/erc20:0x0000000000000000000000000000000000000f00',
  contractAddress: '0x0000000000000000000000000000000000000f00',
  symbol: 'FOO',
  name: 'Foo',
  precision: 18,
}

const makeAdapter = (getKnownTokens: () => TokenInfo[] = () => []) =>
  new monad.ChainAdapter({
    rpcUrl: 'http://localhost',
    getKnownTokens,
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

  describe('getAccount', () => {
    const pubkey = '0x1111111111111111111111111111111111111111'

    beforeEach(() => {
      vi.spyOn(mockViemClient, 'getTransactionCount').mockResolvedValue(7)
    })

    it('reads only the native balance when there are no known tokens', async () => {
      const multicall = vi
        .spyOn(mockViemClient, 'multicall')
        .mockResolvedValue([{ status: 'success', result: BigInt(42) }])
      const adapter = makeAdapter(() => [])

      const account = await adapter.getAccount(pubkey)

      expect(account.balance).toBe('42')
      expect(account.chainSpecific.tokens).toEqual([])
      expect(multicall).toHaveBeenCalledTimes(1)
      expect(multicall.mock.calls[0][0].contracts).toHaveLength(1)
    })

    it('returns token balances when there are known tokens', async () => {
      vi.spyOn(mockViemClient, 'multicall').mockResolvedValue([
        { status: 'success', result: BigInt(42) },
        { status: 'success', result: BigInt(1000) },
      ])
      const adapter = makeAdapter(() => [FOO_TOKEN])

      const account = await adapter.getAccount(pubkey)

      expect(account.balance).toBe('42')
      expect(account.chainSpecific.tokens).toEqual([
        {
          assetId: FOO_TOKEN.assetId,
          balance: '1000',
          symbol: 'FOO',
          name: 'Foo',
          precision: 18,
        },
      ])
    })

    it('omits zero balances from the known tokens', async () => {
      vi.spyOn(mockViemClient, 'multicall').mockResolvedValue([
        { status: 'success', result: BigInt(42) },
        { status: 'success', result: BigInt(0) },
      ])
      const adapter = makeAdapter(() => [FOO_TOKEN])

      const account = await adapter.getAccount(pubkey)

      expect(account.chainSpecific.tokens).toEqual([])
    })

    it('reads balances individually on chains without multicall3', async () => {
      const multicall = vi.spyOn(mockViemClient, 'multicall')
      vi.spyOn(mockViemClient, 'getBalance').mockResolvedValue(BigInt(42))
      vi.spyOn(mockViemClient, 'readContract').mockResolvedValue(BigInt(1000))
      const { chain } = mockViemClient
      mockViemClient.chain = { contracts: {} } as typeof chain
      const adapter = makeAdapter(() => [FOO_TOKEN])

      const account = await adapter.getAccount(pubkey).finally(() => {
        mockViemClient.chain = chain
      })

      expect(account.balance).toBe('42')
      expect(account.chainSpecific.tokens).toEqual([
        {
          assetId: FOO_TOKEN.assetId,
          balance: '1000',
          symbol: 'FOO',
          name: 'Foo',
          precision: 18,
        },
      ])
      expect(multicall).not.toHaveBeenCalled()
    })

    it('fails when the native balance read fails', async () => {
      vi.spyOn(mockViemClient, 'multicall').mockResolvedValue([
        { status: 'failure', error: new Error('boom') },
        { status: 'success', result: BigInt(1000) },
      ])
      const adapter = makeAdapter(() => [FOO_TOKEN])

      await expect(adapter.getAccount(pubkey)).rejects.toThrow('boom')
    })
  })
})
