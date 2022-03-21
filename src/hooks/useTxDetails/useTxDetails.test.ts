import { BtcSend, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import { getBuyTx, getSellTx, getStandardTx, getTransferByAsset, getTransferByType } from 'hooks/useTxDetails/useTxDetails'
import { Asset, chainAdapters } from '@shapeshiftoss/types'

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

describe('getTransferByType', () => {
  describe('TxType.Send', () => {
    it('finds transfer with TxType.Send', () => {
      const result = getTransferByType(EthSend, chainAdapters.TxType.Send)
      const expected = EthSend.transfers[0]
      expect(result).toEqual<chainAdapters.TxTransfer>(expected)
    })
    it('returns undefined on failure', () => {
      // receive !== send
      const result = getTransferByType(EthReceive, chainAdapters.TxType.Send)
      const expected = undefined
      expect(result).toEqual<undefined>(expected)
    })

    describe('TxType.Receive', () => {
      it('finds transfer with TxType.Receive', () => {
        const result = getTransferByType(EthReceive, chainAdapters.TxType.Receive)
        const expected = EthReceive.transfers[0]
        expect(result).toEqual<chainAdapters.TxTransfer>(expected)
      })
      it('returns undefined on failure', () => {
        // send !== receive
        const result = getTransferByType(EthSend, chainAdapters.TxType.Receive)
        const expected = undefined
        expect(result).toEqual<undefined>(expected)
      })
    })
  })
})

describe('getTransferByAsset', () => {
  it('finds transfer with asset', () => {
    const asset = {
      caip19: 'eip155:1/slip44:60'
    } as Asset
    const result = getTransferByAsset(EthSend, asset)
    const expected = EthSend.transfers[0]
    expect(result).toEqual<chainAdapters.TxTransfer>(expected)
  })
  it('returns undefined on failure', () => {
    const asset = {
      caip19: 'eip999:1/0x:ZZ'
    } as Asset
    const result = getTransferByAsset(EthSend, asset)
    const expected = undefined
    expect(result).toEqual<undefined>(expected)
  })
})