import { TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getReportLegs, toReportDate } from './utils'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { ethereum, fox, usdc } from '@/test/mocks/assets'

const user = '0x3c0100F53b49BA4d3A33fc6e8827Ea3A9784D2fF'
const router = '0xEE0319cF0BCa5d09333f9F6277743E8De31bD69A'
const other = '0x1111111111111111111111111111111111111111'

const blankLeg = {
  sentAmount: '',
  sentCurrency: '',
  sentAddresses: '',
  receivedAmount: '',
  receivedCurrency: '',
  receivedAddresses: '',
}

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
  describe('getReportLegs', () => {
    it('returns one blank leg when there are no transfers', () => {
      expect(getReportLegs([])).toEqual([blankLeg])
    })

    it('reports a send as sent only, keeping the recipient address', () => {
      expect(getReportLegs([usdcSend])).toEqual([
        {
          sentAmount: '2002.24',
          sentCurrency: 'USDC',
          sentAddresses: `"${user}"`,
          receivedAmount: '',
          receivedCurrency: '',
          receivedAddresses: `"${router}"`,
        },
      ])
    })

    it('reports a receive as received only, keeping the sender address', () => {
      expect(getReportLegs([usdcReceive])).toEqual([
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: `"${other}"`,
          receivedAmount: '250',
          receivedCurrency: 'USDC',
          receivedAddresses: `"${user}"`,
        },
      ])
    })

    it('ignores contract transfers, which are not the user funds', () => {
      expect(getReportLegs([contract])).toEqual([blankLeg])
    })

    it('pairs the token sold with the token bought and puts a native fee on its own leg', () => {
      expect(getReportLegs([ethSend, usdcSend, foxReceive])).toEqual([
        {
          sentAmount: '2002.24',
          sentCurrency: 'USDC',
          sentAddresses: `"${user}"`,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: `"${user}"`,
        },
        {
          sentAmount: '0.0005',
          sentCurrency: 'ETH',
          sentAddresses: `"${user}"`,
          receivedAmount: '',
          receivedCurrency: '',
          receivedAddresses: `"${router}"`,
        },
      ])
    })

    it('reports a native swap as a single trade leg', () => {
      expect(getReportLegs([ethSend, foxReceive])).toEqual([
        {
          sentAmount: '0.0005',
          sentCurrency: 'ETH',
          sentAddresses: `"${user}"`,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: `"${user}"`,
        },
      ])
    })

    it('reports each receive of a receive-only tx on its own leg', () => {
      expect(getReportLegs([foxReceive, usdcReceive])).toEqual([
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: `"${router}"`,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: `"${user}"`,
        },
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: `"${other}"`,
          receivedAmount: '250',
          receivedCurrency: 'USDC',
          receivedAddresses: `"${user}"`,
        },
      ])
    })
  })

  describe('toReportDate', () => {
    it('formats the block time as a utc date tax tools accept', () => {
      expect(toReportDate(1778855615)).toBe('2026-05-15 14:33:35')
    })
  })
})
