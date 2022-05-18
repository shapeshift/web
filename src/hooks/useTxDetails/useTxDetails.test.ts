import { Asset, chainAdapters } from '@shapeshiftoss/types'
import { BtcSend, createMockEthTxs, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import {
  getBuyTransfer,
  getSellTransfer,
  getStandardTx,
  getTransferByAsset,
  getTransferByType,
  isSupportedContract,
  isTradeContract,
} from 'hooks/useTxDetails/useTxDetails'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

describe('getStandardTx', () => {
  it('returns the expected values', () => {
    expect(getStandardTx(EthSend)).toEqual(EthSend.transfers[0]) // When 1 transfer (an ETH tx)
    expect(getStandardTx(BtcSend)).toBeUndefined() // When !== 1 transfer (a BTC tx)
  })
})

describe('getBuyTransfer', () => {
  it('returns the expected values', () => {
    expect(getBuyTransfer(EthSend)).toBeUndefined()
    expect(getBuyTransfer(EthReceive)).toEqual(EthReceive.transfers[0])
    expect(getBuyTransfer(TradeTx)).toEqual(TradeTx.transfers[0])
  })
})

describe('getSellTransfer', () => {
  it('returns the expected values', () => {
    expect(getSellTransfer(EthSend)).toEqual(EthSend.transfers[0])
    expect(getSellTransfer(EthReceive)).toBeUndefined()
    expect(getSellTransfer(TradeTx)).toEqual(TradeTx.transfers[1])
  })
})

describe('isTradeContract', () => {
  it('returns true for trade', () => {
    const account = '0xfoxy'
    const buy = {
      from: '0xpoolA',
      to: account,
    } as chainAdapters.TxTransfer
    const sell = {
      from: account,
      to: '0xpoolB',
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(true)
  })

  it('returns false when seller.from !== buyer.to', () => {
    const buy = {
      from: '0xpoolA',
      to: '0xfoxy',
    } as chainAdapters.TxTransfer
    const sell = {
      from: '0xzyzz',
      to: '0xpoolB',
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
  })

  it('returns false when sellTransfer.to === buyTransfer.from', () => {
    const account = '0xfoxy'
    const pool = '0xpool'
    const buy = {
      from: pool,
      to: account,
    } as chainAdapters.TxTransfer
    const sell = {
      from: account,
      to: pool,
    } as chainAdapters.TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
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
      assetId: 'eip155:1/slip44:60',
    } as Asset
    const result = getTransferByAsset(EthSend, asset)
    const expected = EthSend.transfers[0]
    expect(result).toEqual(expected)
  })
  it('returns undefined on failure', () => {
    const asset = {
      assetId: 'eip999:1/0x:ZZ',
    } as Asset
    const result = getTransferByAsset(EthSend, asset)
    expect(result).toBeUndefined()
  })
})

describe('isSupportedContract', () => {
  it('returns true for being supported', () => {
    createMockEthTxs('0xcafe').forEach(tx => expect(isSupportedContract(tx)).toBe(true))
  })

  it('returns false when unsupported', () => {
    createMockEthTxs('0xface').forEach((tx, idx) => {
      expect(tx.data).toHaveProperty('method')
      if (tx.data?.method) tx.data.method += `-fail-${idx}`
      expect(isSupportedContract(tx)).toBe(false)
    })
  })

  it('returns false for undefined', () => {
    const tx = { data: { method: undefined } } as Tx
    expect(isSupportedContract(tx)).toBe(false)
  })
})
