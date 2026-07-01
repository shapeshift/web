import { describe, expect, it, vi } from 'vitest'

vi.mock('@shapeshiftoss/chain-adapters', async importOriginal => {
  const actual = await importOriginal<typeof import('@shapeshiftoss/chain-adapters')>()
  return {
    ...actual,
    evm: {
      ...actual.evm,
      getFees: vi.fn(async () => ({ networkFeeCryptoBaseUnit: '1', gasLimit: '21000' })),
    },
  }
})

// eslint-disable-next-line import/first
import { butterSwapApi } from './endpoints'

const makeQuote = (transactionData: any) => ({
  id: 'q1',
  quoteOrRate: 'quote',
  rate: '1',
  steps: [
    {
      accountNumber: 0,
      sellAsset: { chainId: 'eip155:1', assetId: 'eip155:1/slip44:60' },
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '7',
      transactionData,
    },
  ],
})

describe('butterSwap getUnsignedEvmTransaction', () => {
  it('builds from step.transactionData (evm), not butterSwapTransactionMetadata', async () => {
    const buildCustomApiTx = vi.fn(async (a: any) => a)
    const adapter = {
      buildCustomApiTx,
    }
    const tx = await butterSwapApi.getUnsignedEvmTransaction!({
      from: '0xFROM',
      stepIndex: 0,
      tradeQuote: makeQuote({
        type: 'evm',
        chainId: 1,
        to: '0xTO',
        data: '0xDATA',
        value: '7',
        gasLimit: '21000',
      }) as any,
      supportsEIP1559: true,
      assertGetEvmChainAdapter: () => adapter as any,
    } as any)
    expect(tx).toMatchObject({ to: '0xTO', data: '0xDATA', value: '7' })
  })
})
