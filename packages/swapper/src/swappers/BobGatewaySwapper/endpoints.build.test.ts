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
import { bobGatewayApi } from './endpoints'

const makeQuote = (sellAsset: any, transactionData: any) => ({
  id: 'q1',
  quoteOrRate: 'quote',
  rate: '1',
  steps: [
    {
      accountNumber: 0,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '7',
      feeData: { chainSpecific: { satsPerByte: '2' } },
      transactionData,
    },
  ],
})

describe('bob getUnsignedEvmTransaction', () => {
  it('builds from step.transactionData (evm), not bobSpecific', async () => {
    const buildCustomApiTx = vi.fn(async (a: any) => a)
    const adapter = { buildCustomApiTx }
    const tx = await bobGatewayApi.getUnsignedEvmTransaction!({
      from: '0xFROM',
      stepIndex: 0,
      tradeQuote: makeQuote(
        { chainId: 'eip155:8453', assetId: 'eip155:8453/slip44:60' },
        { type: 'evm', chainId: 8453, to: '0xTO', data: '0xDATA', value: '7' },
      ) as any,
      supportsEIP1559: true,
      assertGetEvmChainAdapter: () => adapter as any,
    } as any)
    expect(tx).toMatchObject({ to: '0xTO', data: '0xDATA', value: '7' })
  })
})

describe('bob getUnsignedUtxoTransaction', () => {
  it('builds from step.transactionData (utxo), not bobSpecific', () => {
    const buildSendApiTransaction = vi.fn((a: any) => a)
    const adapter = { buildSendApiTransaction }
    const tx = bobGatewayApi.getUnsignedUtxoTransaction!({
      stepIndex: 0,
      tradeQuote: makeQuote(
        { chainId: 'bip122:000000000019d6689c085ae165831e93', assetId: 'bip122:x/slip44:0' },
        { type: 'utxo', depositAddress: 'bc1qDEPOSIT', memo: '0xMEMO', value: '7' },
      ) as any,
      xpub: 'xpub',
      accountType: 'p2wpkh',
      assertGetUtxoChainAdapter: () => adapter as any,
    } as any)
    expect(tx).toMatchObject({
      to: 'bc1qDEPOSIT',
      chainSpecific: expect.objectContaining({ opReturnData: '0xMEMO' }),
    })
  })
})
