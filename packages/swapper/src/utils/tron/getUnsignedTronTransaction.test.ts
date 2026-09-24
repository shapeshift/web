import { tronChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import type { TradeQuote, TxBuildData } from '../../types'
import { ETH } from '../test-data/assets'
import { getUnsignedTronTransaction } from './getUnsignedTronTransaction'

const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const TRX: Asset = { ...ETH, assetId: `${tronChainId}/slip44:195`, chainId: tronChainId }
const USDT_TRON: Asset = { ...ETH, assetId: `${tronChainId}/trc20:${USDT}`, chainId: tronChainId }
const FROM = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'
const TO = 'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj'

const makeArgs = (
  sellAsset: Asset,
  transactionData: TxBuildData | undefined,
  feeData: { networkFeeCryptoBaseUnit: string | undefined } = {
    networkFeeCryptoBaseUnit: '9000000',
  },
) => {
  const adapter = {
    buildCustomApiTx: vi.fn().mockResolvedValue('custom'),
    buildSendApiTransaction: vi.fn().mockResolvedValue('send'),
  }
  const tradeQuote = {
    quoteOrRate: 'quote',
    steps: [
      { accountNumber: 0, sellAsset, transactionData, feeData },
    ],
  } as unknown as TradeQuote

  return {
    adapter,
    args: {
      tradeQuote,
      stepIndex: 0 as const,
      from: FROM,
      assertGetTronChainAdapter: () => adapter,
    } as unknown as Parameters<typeof getUnsignedTronTransaction>[0],
  }
}

describe('getUnsignedTronTransaction', () => {
  it('builds a contract call when data is present', async () => {
    const { adapter, args } = makeArgs(TRX, {
      type: 'tron',
      to: TO,
      data: '0xdeadbeef',
      value: '1',
    })

    expect(await getUnsignedTronTransaction(args)).toBe('custom')
    expect(adapter.buildCustomApiTx).toHaveBeenCalledWith({
      from: FROM,
      to: TO,
      accountNumber: 0,
      data: '0xdeadbeef',
      value: '1',
      feeLimit: 27_000_000,
    })
  })

  it('bounds the fee limit by the standard limit when the step carries no estimate', async () => {
    const { adapter, args } = makeArgs(
      TRX,
      { type: 'tron', to: TO, data: '0xdeadbeef', value: '1' },
      { networkFeeCryptoBaseUnit: undefined },
    )

    await getUnsignedTronTransaction(args)
    expect(adapter.buildCustomApiTx).toHaveBeenCalledWith(
      expect.objectContaining({ feeLimit: 100_000_000 }),
    )
  })

  it('builds a send of the sell asset when data is absent', async () => {
    const { adapter, args } = makeArgs(USDT_TRON, {
      type: 'tron',
      to: TO,
      value: '1',
      memo: '=:ETH.ETH:0xabc',
    })

    expect(await getUnsignedTronTransaction(args)).toBe('send')
    expect(adapter.buildSendApiTransaction).toHaveBeenCalledWith({
      from: FROM,
      to: TO,
      accountNumber: 0,
      value: '1',
      chainSpecific: { contractAddress: USDT, memo: '=:ETH.ETH:0xabc', feeLimit: 27_000_000 },
    })
  })

  it('throws without tron transactionData', () => {
    const { args } = makeArgs(TRX, undefined)

    expect(() => getUnsignedTronTransaction(args)).toThrow('Missing tron transactionData')
  })
})
