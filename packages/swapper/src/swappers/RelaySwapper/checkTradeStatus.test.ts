import { describe, expect, it, vi } from 'vitest'

vi.mock('./utils/notifyTransactionIndexing', () => ({
  notifyTransactionIndexing: vi.fn(async () => ({ isErr: () => false })),
}))
vi.mock('./utils/relayService', () => ({
  relayService: {
    get: vi.fn(async () => ({
      isErr: () => false,
      unwrap: () => ({
        data: { status: 'pending', txHashes: [], inTxHashes: [], originChainId: 1, destinationChainId: 1, time: 0 },
      }),
    })),
  },
}))

// eslint-disable-next-line import/first
import { relayApi } from './endpoints'
// eslint-disable-next-line import/first
import { notifyTransactionIndexing } from './utils/notifyTransactionIndexing'

describe('relay checkTradeStatus', () => {
  it('reads relay tracking metadata and posts calldata to the indexer', async () => {
    await relayApi.checkTradeStatus!({
      swap: {
        id: 's1',
        metadata: { swapperMetadata: { name: 'relay', relayId: 'req_9', data: '0xcalldata' } },
      } as any,
      txHash: '0xhash',
      chainId: 'eip155:1',
      address: '0xFROM',
      config: { VITE_RELAY_API_URL: 'https://api.relay.link' } as any,
      fetchIsSmartContractAddressQuery: vi.fn(async () => false) as any,
      assertGetEvmChainAdapter: vi.fn() as any,
    } as any)

    expect(notifyTransactionIndexing).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req_9', tx: '0xcalldata' }),
      expect.anything(),
    )
  })
})
