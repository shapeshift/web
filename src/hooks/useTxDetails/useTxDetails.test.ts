import { chainAdapters } from '@shapeshiftoss/types'
import { BtcSend, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import {
  getBuyTransfer,
  getSellTransfer,
  getStandardTx,
  isTradeContract
} from 'hooks/useTxDetails/useTxDetails'

describe('getStandardTx', () => {
  it('returns the expected values', () => {
    expect(getStandardTx(EthSend)).toEqual(EthSend.transfers[0]) // When 1 transfer (an ETH tx)
    expect(getStandardTx(BtcSend)).toEqual(undefined) // When !== 1 transfer (a BTC tx)
  })
})

describe('getBuyTransfer', () => {
  it('returns the expected values', () => {
    expect(getBuyTransfer(EthSend)).toEqual(undefined)
    expect(getBuyTransfer(EthReceive)).toEqual(EthReceive.transfers[0])
    expect(getBuyTransfer(TradeTx)).toEqual(TradeTx.transfers[0])
  })
})

describe('getSellTransfer', () => {
  it('returns the expected values', () => {
    expect(getSellTransfer(EthSend)).toEqual(EthSend.transfers[0])
    expect(getSellTransfer(EthReceive)).toEqual(undefined)
    expect(getSellTransfer(TradeTx)).toEqual(TradeTx.transfers[1])
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

  it('returns false when sellTransfer.to === buyTransfer.from', () => {
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
