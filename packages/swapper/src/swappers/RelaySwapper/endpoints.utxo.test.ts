import { describe, expect, it, vi } from 'vitest'

import { relayApi } from './endpoints'

describe('relay getUnsignedUtxoTransaction', () => {
  it('builds from step.transactionData (utxo)', async () => {
    const buildSendApiTransaction = vi.fn(async (a: any) => a)
    const adapter = {
      getFeeData: vi.fn(async () => ({ fast: { chainSpecific: { satoshiPerByte: '1' } } })),
      buildSendApiTransaction,
    }
    const quote = {
      id: 'q1',
      quoteOrRate: 'quote',
      steps: [
        {
          accountNumber: 0,
          sellAsset: {
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            assetId: 'bip122:.../slip44:0',
          },
          sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000',
          transactionData: {
            type: 'utxo',
            depositAddress: 'bc1relayer',
            memo: 'deadbeef',
            value: '1000',
          },
        },
      ],
    }
    await relayApi.getUnsignedUtxoTransaction!({
      stepIndex: 0,
      tradeQuote: quote as any,
      xpub: 'xpub',
      accountType: 'p2wpkh',
      assertGetUtxoChainAdapter: () => adapter as any,
    } as any)
    expect(buildSendApiTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bc1relayer',
        chainSpecific: expect.objectContaining({ opReturnData: 'deadbeef' }),
      }),
    )
  })
})
