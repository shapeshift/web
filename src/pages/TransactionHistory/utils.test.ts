import { TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getReportColumns } from './utils'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { ethereum, fox, usdc } from '@/test/mocks/assets'

const user = '0x3c0100F53b49BA4d3A33fc6e8827Ea3A9784D2fF'
const router = '0xEE0319cF0BCa5d09333f9F6277743E8De31bD69A'
const other = '0x1111111111111111111111111111111111111111'

const empty = { amount: '-', currency: '-', addresses: '-' }

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
  asset: usdc,
  from: [user],
  to: [router],
  value: '2002240000',
}

const foxReceive: Transfer = {
  type: TransferType.Receive,
  assetId: fox.assetId,
  asset: fox,
  from: [router],
  to: [user],
  value: '435857000000000000',
}

const usdcReceive: Transfer = {
  type: TransferType.Receive,
  assetId: usdc.assetId,
  asset: usdc,
  from: [other],
  to: [user],
  value: '250000000',
}

const contract: Transfer = {
  type: TransferType.Contract,
  assetId: ethereum.assetId,
  asset: ethereum,
  from: [user],
  to: [other],
  value: '1000000000000000000',
}

describe('TransactionHistory/utils', () => {
  describe('getReportColumns', () => {
    it('returns placeholders when there are no transfers', () => {
      expect(getReportColumns([])).toEqual({ input: empty, output: empty })
    })

    it('reports a single send from the user to the recipient', () => {
      expect(getReportColumns([usdcSend])).toEqual({
        input: { amount: '2002.24', currency: 'USDC', addresses: `"${user}"` },
        output: { amount: '2002.24', currency: 'USDC', addresses: `"${router}"` },
      })
    })

    it('reports a single receive from the sender to the user', () => {
      expect(getReportColumns([usdcReceive])).toEqual({
        input: { amount: '250', currency: 'USDC', addresses: `"${other}"` },
        output: { amount: '250', currency: 'USDC', addresses: `"${user}"` },
      })
    })

    it('reports a contract transfer the same way as a single send', () => {
      expect(getReportColumns([contract])).toEqual({
        input: { amount: '1', currency: 'ETH', addresses: `"${user}"` },
        output: { amount: '1', currency: 'ETH', addresses: `"${other}"` },
      })
    })

    it('lists every send and the bought asset for a swap that forwards a native fee', () => {
      expect(getReportColumns([ethSend, usdcSend, foxReceive])).toEqual({
        input: {
          amount: '"0.0005\n2002.24"',
          currency: '"ETH\nUSDC"',
          addresses: `"${user}\n${user}"`,
        },
        output: { amount: '0.435857', currency: 'FOX', addresses: `"${user}"` },
      })
    })

    it('reports the destinations of a send-only tx as its output', () => {
      expect(getReportColumns([ethSend, usdcSend])).toEqual({
        input: {
          amount: '"0.0005\n2002.24"',
          currency: '"ETH\nUSDC"',
          addresses: `"${user}\n${user}"`,
        },
        output: {
          amount: '"0.0005\n2002.24"',
          currency: '"ETH\nUSDC"',
          addresses: `"${router}\n${router}"`,
        },
      })
    })

    it('reports the sources of a receive-only tx as its input', () => {
      expect(getReportColumns([foxReceive, usdcReceive])).toEqual({
        input: {
          amount: '"0.435857\n250"',
          currency: '"FOX\nUSDC"',
          addresses: `"${router}\n${other}"`,
        },
        output: {
          amount: '"0.435857\n250"',
          currency: '"FOX\nUSDC"',
          addresses: `"${user}\n${user}"`,
        },
      })
    })
  })
})
