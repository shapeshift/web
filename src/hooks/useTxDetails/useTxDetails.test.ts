import { Asset, chainAdapters } from '@shapeshiftoss/types'
import { BtcSend, createMockEthTxs, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import {
  getBuyTx,
  getSellTx,
  getStandardTx,
  getTransferByAsset,
  getTransferByType,
  isSupportedContract
} from 'hooks/useTxDetails/useTxDetails'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

describe('getStandardTx', () => {
  it('returns the expected values', () => {
    expect(getStandardTx(EthSend)).toEqual(EthSend.transfers[0]) // When 1 transfer (an ETH tx)
    expect(getStandardTx(BtcSend)).toBeUndefined() // When !== 1 transfer (a BTC tx)
  })
})

describe('getBuyTx', () => {
  it('returns the expected values', () => {
    expect(getBuyTx(EthSend)).toBeUndefined()
    expect(getBuyTx(EthReceive)).toEqual(EthReceive.transfers[0])
    expect(getBuyTx(TradeTx)).toEqual(TradeTx.transfers[0])
  })
})

describe('getSellTx', () => {
  it('returns the expected values', () => {
    expect(getSellTx(EthSend)).toEqual(EthSend.transfers[0])
    expect(getSellTx(EthReceive)).toBeUndefined()
    expect(getSellTx(TradeTx)).toEqual(TradeTx.transfers[1])
  })
})

describe('getTransferByType', () => {
  describe('TxType.Send', () => {
    it('finds transfer with TxType.Send', () => {
      const result = getTransferByType(EthSend, chainAdapters.TxType.Send)
      const expected = EthSend.transfers[0]
      expect(result).toEqual(expected)
    })
    it('returns undefined on failure', () => {
      // receive !== send
      const result = getTransferByType(EthReceive, chainAdapters.TxType.Send)
      expect(result).toBeUndefined()
    })

    describe('TxType.Receive', () => {
      it('finds transfer with TxType.Receive', () => {
        const result = getTransferByType(EthReceive, chainAdapters.TxType.Receive)
        const expected = EthReceive.transfers[0]
        expect(result).toEqual(expected)
      })
      it('returns undefined on failure', () => {
        // send !== receive
        const result = getTransferByType(EthSend, chainAdapters.TxType.Receive)
        expect(result).toBeUndefined()
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
    expect(result).toEqual(expected)
  })
  it('returns undefined on failure', () => {
    const asset = {
      caip19: 'eip999:1/0x:ZZ'
    } as Asset
    const result = getTransferByAsset(EthSend, asset)
    expect(result).toBeUndefined()
  })
})

describe('isSupportedContract', () => {
  it('returns true for being supported', () => {
    createMockEthTxs('0xcafe').forEach(tx => expect(isSupportedContract(tx)).toBeTruthy())
  })

  it('returns false when unsupported', () => {
    createMockEthTxs('0xface')
      .map((tx, idx) => {
        tx.data.method += `-${idx}`
        return tx
      })
      .forEach(tx => expect(isSupportedContract(tx)).toBeFalsy())
  })

  it('returns false for undefined', () => {
    const tx = { data: { method: undefined }} as Tx
    expect(isSupportedContract(tx)).toBeFalsy()
  })
})
