import { TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getTransferColumns } from './utils'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { ethereum, usdc } from '@/test/mocks/assets'

const user = '0x3c0100F53b49BA4d3A33fc6e8827Ea3A9784D2fF'
const router = '0xEE0319cF0BCa5d09333f9F6277743E8De31bD69A'

const ethSend: Transfer = {
  type: TransferType.Send,
  assetId: ethereum.assetId,
  asset: ethereum,
  from: [user],
  to: [router],
  value: '500000000000000',
}

const usdcSend: Transfer = {
  type: TransferType.Send,
  assetId: usdc.assetId,
  asset: { ...usdc, symbol: 'USDC' },
  from: [user],
  to: [router],
  value: '2002240000',
}

describe('TransactionHistory/utils', () => {
  describe('getTransferColumns', () => {
    it('returns placeholders when there are no transfers', () => {
      expect(getTransferColumns([], 'from')).toEqual({
        amount: '-',
        currency: '-',
        addresses: '-',
      })
    })

    it('formats a single transfer', () => {
      expect(getTransferColumns([usdcSend], 'from')).toEqual({
        amount: '2002.24',
        currency: 'USDC',
        addresses: `"${user}"`,
      })
    })

    it('lists every transfer when a tx has more than one of the same direction', () => {
      expect(getTransferColumns([ethSend, usdcSend], 'to')).toEqual({
        amount: '"0.0005\n2002.24"',
        currency: '"ETH\nUSDC"',
        addresses: `"${router}\n${router}"`,
      })
    })
  })
})
