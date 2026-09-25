import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import { extractTransactionData } from './extractTransactionData'

const TRON_CHAIN_ID = 'tron:0x2b6653dc'

const tronStep = (transactionData: TradeQuoteStep['transactionData']) =>
  ({ sellAsset: { chainId: TRON_CHAIN_ID }, transactionData }) as unknown as TradeQuoteStep

describe('extractTransactionData', () => {
  describe('tron', () => {
    it('serializes a contract call', () => {
      const step = tronStep({
        type: 'tron',
        to: 'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj',
        data: '0xdeadbeef',
        value: '1000000',
      })

      expect(extractTransactionData(step)).toEqual({
        type: 'tron',
        to: 'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj',
        data: '0xdeadbeef',
        value: '1000000',
        memo: undefined,
      })
    })

    it('prefixes bare calldata hex', () => {
      const step = tronStep({
        type: 'tron',
        to: '41f0623e1012177482912fb057e44e1a9769b1f5c2',
        data: '49290c1c',
        value: '50000000',
      })

      expect(extractTransactionData(step)).toMatchObject({
        to: 'TXtEs6t2oUWQsNos7m68gbHdE9QCMoqLm5',
        data: '0x49290c1c',
      })
    })

    it('serializes a transfer with memo', () => {
      const step = tronStep({
        type: 'tron',
        to: 'TVault',
        value: '1000000',
        memo: '=:ETH.ETH:0xabc',
      })

      expect(extractTransactionData(step)).toEqual({
        type: 'tron',
        to: 'TVault',
        value: '1000000',
        data: undefined,
        memo: '=:ETH.ETH:0xabc',
      })
    })

    it('is undefined when the step carries no tron transactionData', () => {
      expect(extractTransactionData(tronStep(undefined))).toBeUndefined()
    })
  })
})
