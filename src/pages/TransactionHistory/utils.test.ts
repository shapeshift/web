import { TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getReportLegs, toCsvCell, toReportDate } from './utils'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { bitcoin, ethereum, fox, usdc } from '@/test/mocks/assets'

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

const ethRefund: Transfer = {
  type: TransferType.Receive,
  assetId: ethereum.assetId,
  asset: ethereum,
  from: [router],
  to: [user],
  value: '100000000000000',
}

const btcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const btcChange = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'

const btcSelfSend: Transfer[] = [
  {
    type: TransferType.Send,
    assetId: bitcoin.assetId,
    asset: bitcoin,
    from: [btcAddress],
    to: [btcChange],
    value: '50000000',
  },
  {
    type: TransferType.Receive,
    assetId: bitcoin.assetId,
    asset: bitcoin,
    from: [btcAddress],
    to: [btcChange],
    value: '50000000',
  },
]

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
      expect(getReportLegs([], ethereum.assetId)).toEqual([blankLeg])
    })

    it('reports a send as sent only, keeping the recipient address', () => {
      expect(getReportLegs([usdcSend], ethereum.assetId)).toEqual([
        {
          sentAmount: '2002.24',
          sentCurrency: 'USDC',
          sentAddresses: user,
          receivedAmount: '',
          receivedCurrency: '',
          receivedAddresses: router,
        },
      ])
    })

    it('reports a receive as received only, keeping the sender address', () => {
      expect(getReportLegs([usdcReceive], ethereum.assetId)).toEqual([
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: other,
          receivedAmount: '250',
          receivedCurrency: 'USDC',
          receivedAddresses: user,
        },
      ])
    })

    it('ignores contract transfers, which are not the user funds', () => {
      expect(getReportLegs([contract], ethereum.assetId)).toEqual([blankLeg])
    })

    it('pairs the token sold with the token bought and puts a native fee on its own leg', () => {
      expect(getReportLegs([ethSend, usdcSend, foxReceive], ethereum.assetId)).toEqual([
        {
          sentAmount: '2002.24',
          sentCurrency: 'USDC',
          sentAddresses: user,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: user,
        },
        {
          sentAmount: '0.0005',
          sentCurrency: 'ETH',
          sentAddresses: user,
          receivedAmount: '',
          receivedCurrency: '',
          receivedAddresses: router,
        },
      ])
    })

    it('reports a native swap as a single trade leg', () => {
      expect(getReportLegs([ethSend, foxReceive], ethereum.assetId)).toEqual([
        {
          sentAmount: '0.0005',
          sentCurrency: 'ETH',
          sentAddresses: user,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: user,
        },
      ])
    })

    it('pairs the token bought ahead of a native refund received in the same tx', () => {
      expect(getReportLegs([usdcSend, ethRefund, foxReceive], ethereum.assetId)).toEqual([
        {
          sentAmount: '2002.24',
          sentCurrency: 'USDC',
          sentAddresses: user,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: user,
        },
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: router,
          receivedAmount: '0.0001',
          receivedCurrency: 'ETH',
          receivedAddresses: user,
        },
      ])
    })

    it('keeps a same-asset self send as a transfer rather than a trade', () => {
      expect(getReportLegs(btcSelfSend, bitcoin.assetId)).toEqual([
        {
          sentAmount: '0.5',
          sentCurrency: 'BTC',
          sentAddresses: btcAddress,
          receivedAmount: '',
          receivedCurrency: '',
          receivedAddresses: btcChange,
        },
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: btcAddress,
          receivedAmount: '0.5',
          receivedCurrency: 'BTC',
          receivedAddresses: btcChange,
        },
      ])
    })

    it('reports each receive of a receive-only tx on its own leg', () => {
      expect(getReportLegs([foxReceive, usdcReceive], ethereum.assetId)).toEqual([
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: router,
          receivedAmount: '0.435857',
          receivedCurrency: 'FOX',
          receivedAddresses: user,
        },
        {
          sentAmount: '',
          sentCurrency: '',
          sentAddresses: other,
          receivedAmount: '250',
          receivedCurrency: 'USDC',
          receivedAddresses: user,
        },
      ])
    })
  })

  describe('toReportDate', () => {
    it('formats the block time as a utc date tax tools accept', () => {
      expect(toReportDate(1778855615)).toBe('2026-05-15 14:33:35')
    })

    it('leaves the date blank for an unconfirmed tx', () => {
      expect(toReportDate(0)).toBe('')
    })
  })

  describe('toCsvCell', () => {
    it('passes plain values through', () => {
      expect(toCsvCell('2002.24')).toBe('2002.24')
    })

    it('quotes values containing delimiters and doubles inner quotes', () => {
      expect(toCsvCell('USDC,FREE')).toBe('"USDC,FREE"')
      expect(toCsvCell('say "hi"')).toBe('"say ""hi"""')
      expect(toCsvCell(`${user}, ${other}`)).toBe(`"${user}, ${other}"`)
    })

    it('neutralises a value that would run as a spreadsheet formula', () => {
      expect(toCsvCell('=HYPERLINK("http://evil","claim")')).toBe(
        `"'=HYPERLINK(""http://evil"",""claim"")"`,
      )
    })
  })
})
