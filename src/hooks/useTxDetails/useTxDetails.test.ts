import { BtcSend, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import { getBuyTx, getSellTx, getStandardTx } from 'hooks/useTxDetails/useTxDetails'

describe('getStandardTx', () => {
  it('returns the expected values', () => {
    expect(getStandardTx(EthSend)).toEqual(EthSend.transfers[0]) // When 1 transfer (an ETH tx)
    expect(getStandardTx(BtcSend)).toEqual(undefined) // When !== 1 transfer (a BTC tx)
  })
})

describe('getBuyTx', () => {
  it('returns the expected values', () => {
    expect(getBuyTx(EthSend)).toEqual(undefined)
    expect(getBuyTx(EthReceive)).toEqual(undefined)
    expect(getBuyTx(TradeTx)).toEqual(TradeTx.transfers[0])
  })
})

describe('getSellTx', () => {
  it('returns the expected values', () => {
    expect(getSellTx(EthSend)).toEqual(undefined)
    expect(getSellTx(EthReceive)).toEqual(undefined)
    expect(getSellTx(TradeTx)).toEqual(TradeTx.transfers[1])
  })
})
