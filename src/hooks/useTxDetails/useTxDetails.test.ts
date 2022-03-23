import { chainAdapters } from '@shapeshiftoss/types'
import { BtcSend, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import {
  getBuyTx,
  getSellTx,
  getStandardTx,
  isTradeContract
} from 'hooks/useTxDetails/useTxDetails'

describe('getStandardTx', () => {
  it('returns the expected values', () => {
    expect(getStandardTx(EthSend)).toEqual(EthSend.transfers[0]) // When 1 transfer (an ETH tx)
    expect(getStandardTx(BtcSend)).toEqual(undefined) // When !== 1 transfer (a BTC tx)
  })
})

describe('getBuyTx', () => {
  it('returns the expected values', () => {
    expect(getBuyTx(EthSend)).toEqual(undefined)
    expect(getBuyTx(EthReceive)).toEqual(EthReceive.transfers[0])
    expect(getBuyTx(TradeTx)).toEqual(TradeTx.transfers[0])
  })
})

describe('getSellTx', () => {
  it('returns the expected values', () => {
    expect(getSellTx(EthSend)).toEqual(EthSend.transfers[0])
    expect(getSellTx(EthReceive)).toEqual(undefined)
    expect(getSellTx(TradeTx)).toEqual(TradeTx.transfers[1])
  })
})

describe('isTradeContract', () => {
  it('returns true for trade', () => {
    const account = '0xfoxy'
    const buy = {
      from: '0xpoolA',
      to: account
    } as chainAdapters.TxTransfer
    const sell = {
      from: account,
      to: '0xpoolB'
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(true)
  })

  it('returns false when seller.from !== buyer.to', () => {
    const buy = {
      from: '0xpoolA',
      to: '0xfoxy'
    } as chainAdapters.TxTransfer
    const sell = {
      from: '0xzyzz',
      to: '0xpoolB'
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
  })

  it('returns false when sellTx.to === buyTx.from', () => {
    const account = '0xfoxy'
    const pool = '0xpool'
    const buy = {
      from: pool,
      to: account
    } as chainAdapters.TxTransfer
    const sell = {
      from: account,
      to: pool
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
  })
})
