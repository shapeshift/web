import type { HDWallet, StarknetWallet } from '@shapeshiftoss/hdwallet-core'
import { describe, expect, it, vi } from 'vitest'

import { ChainAdapter } from './StarknetChainAdapter'

const ADDRESS = '0x2a4490f9596f08ed56a6cf130a1234fe3ef462701e89f8b036786ff8e0ebb42'
const NONCE = '0xc7'

const makeAdapter = () => new ChainAdapter({ rpcUrl: 'http://localhost', getKnownTokens: () => [] })

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) })

const invalidBlockId = { error: { code: -32602, message: 'Invalid params' } }

// Stub provider.fetch per block tag - 'latest' is the deployment probe getNonce runs first
const stubFetch = (adapter: ChainAdapter, byBlockTag: Record<string, () => unknown>) => {
  const provider = (adapter as unknown as { provider: { fetch: unknown } }).provider
  const fetch = vi.fn((_method: string, params: string[]) => {
    const handler = byBlockTag[params[0]]
    if (!handler) throw new Error(`unexpected block tag: ${params[0]}`)
    return Promise.resolve(handler())
  })
  provider.fetch = fetch
  return fetch
}

describe('StarknetChainAdapter', () => {
  describe('getNonce', () => {
    it('reads the nonce from the pre_confirmed block tag', async () => {
      const adapter = makeAdapter()
      const fetch = stubFetch(adapter, {
        latest: () => jsonResponse({ result: NONCE }),
        pre_confirmed: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
      // pending is never reached when the current spec name works
      expect(fetch.mock.calls.map(([, params]) => params[0])).toEqual(['latest', 'pre_confirmed'])
    })

    it('falls back to pending when the node rejects pre_confirmed', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        // pre-0.9 nodes only know the old name
        pre_confirmed: () => jsonResponse(invalidBlockId),
        pending: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
    })

    it('still falls back to pending when the pre_confirmed request throws', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        pre_confirmed: () => {
          throw new Error('non-2xx')
        },
        pending: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
    })

    it('throws rather than reporting a nonce when both block tags fail', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        pre_confirmed: () => jsonResponse(invalidBlockId),
        pending: () => jsonResponse(invalidBlockId),
      })

      await expect(adapter.getNonce(ADDRESS)).rejects.toThrow('Failed to fetch nonce')
    })

    it('returns 0x0 without querying a nonce when the account is not deployed', async () => {
      const adapter = makeAdapter()
      const fetch = stubFetch(adapter, {
        latest: () => jsonResponse({ error: { code: 20, message: 'Contract not found' } }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe('0x0')
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('signAndBroadcastTransaction', () => {
    const txToSign = {
      addressNList: [],
      txHash: '0xabc',
      calls: [{ contractAddress: '0x1', entrypoint: 'transfer', calldata: ['0x2', '10', '0'] }],
    }

    it('lets wallets that submit their own transactions send them, without broadcasting', async () => {
      const adapter = makeAdapter()
      const fetch = stubFetch(adapter, {})
      const wallet = {
        _supportsStarknet: true,
        starknetSignTx: vi.fn(),
        starknetSendTx: vi.fn().mockResolvedValue({ hash: '0xdeadbeef' }),
      } as unknown as HDWallet

      await expect(
        adapter.signAndBroadcastTransaction({
          senderAddress: ADDRESS,
          receiverAddress: ADDRESS,
          signTxInput: { txToSign, wallet },
        }),
      ).resolves.toBe('0xdeadbeef')

      expect((wallet as StarknetWallet).starknetSendTx).toHaveBeenCalledWith(txToSign)
      expect((wallet as StarknetWallet).starknetSignTx).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  it('keeps the wallet reason when an extension refuses to send', async () => {
    const adapter = makeAdapter()
    const wallet = {
      _supportsStarknet: true,
      getVendor: () => 'Braavos',
      starknetSendTx: vi.fn().mockRejectedValue(
        Object.assign(new Error('Braavos must be set to Starknet Mainnet'), {
          code: 'WRONG_NETWORK',
        }),
      ),
    } as unknown as HDWallet

    await expect(
      adapter.signAndBroadcastTransaction({
        senderAddress: ADDRESS,
        receiverAddress: ADDRESS,
        signTxInput: { txToSign: { addressNList: [], txHash: '' }, wallet },
      }),
    ).rejects.toMatchObject({
      metadata: {
        translation: 'chainAdapters.errors.starknetWrongNetwork',
        options: { name: 'Braavos' },
      },
    })
  })

  describe('buildSendApiTransaction', () => {
    it('returns only the calls for an undeployed account, without estimating fees', async () => {
      const adapter = makeAdapter()
      // Every call fails like it does for a contract that doesn't exist yet
      const fetch = vi.fn((_method: string) =>
        Promise.resolve(jsonResponse({ error: { code: 20, message: 'Contract not found' } })),
      )
      ;(adapter as unknown as { provider: { fetch: unknown } }).provider.fetch = fetch

      const txToSign = await adapter.buildSendApiTransaction({
        from: ADDRESS,
        to: ADDRESS,
        value: '10',
        accountNumber: 0,
        chainSpecific: { tokenContractAddress: '0x1', maxFee: '0' },
      })

      expect(txToSign.txHash).toBe('')
      expect(txToSign.calls).toEqual([
        {
          contractAddress: '0x1',
          entrypoint: 'transfer',
          calldata: [expect.any(String), '10', '0'],
        },
      ])
      expect(fetch.mock.calls.map(([method]) => method)).not.toContain('starknet_estimateFee')
    })
  })

  it('refuses to sign a calls-only transaction with a wallet that signs hashes', async () => {
    const adapter = makeAdapter()
    const wallet = { _supportsStarknet: true, starknetSignTx: vi.fn() } as unknown as HDWallet

    await expect(
      adapter.signTransaction({ txToSign: { addressNList: [], txHash: '' }, wallet }),
    ).rejects.toThrow()
    expect((wallet as StarknetWallet).starknetSignTx).not.toHaveBeenCalled()
  })
})
