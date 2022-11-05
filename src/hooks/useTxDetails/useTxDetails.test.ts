import type { Asset } from '@keepkey/asset-service'
import type { TxTransfer } from '@keepkey/chain-adapters'
import { TransferType } from '@keepkey/unchained-client'
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
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

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
    } as TxTransfer
    const sell = {
      from: account,
      to: '0xpoolB',
    } as TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(true)
  })

  it('returns false when seller.from !== buyer.to', () => {
    const buy = {
      from: '0xpoolA',
      to: '0xfoxy',
    } as TxTransfer
    const sell = {
      from: '0xzyzz',
      to: '0xpoolB',
    } as TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
  })

  it('returns false when sellTransfer.to === buyTransfer.from', () => {
    const account = '0xfoxy'
    const pool = '0xpool'
    const buy = {
      from: pool,
      to: account,
    } as TxTransfer
    const sell = {
      from: account,
      to: pool,
    } as TxTransfer
    expect(isTradeContract(buy, sell)).toEqual(false)
  })
})

describe('getTransferByType', () => {
  describe('TransferType.Send', () => {
    it('finds transfer with TransferType.Send', () => {
      const result = getTransferByType(EthSend, TransferType.Send)
      const expected = EthSend.transfers[0]
      expect(result).toEqual(expected)
    })
    it('returns undefined on failure', () => {
      // receive !== send
      const result = getTransferByType(EthReceive, TransferType.Send)
      expect(result).toBeUndefined()
    })

    describe('TransferType.Receive', () => {
      it('finds transfer with TransferType.Receive', () => {
        const result = getTransferByType(EthReceive, TransferType.Receive)
        const expected = EthReceive.transfers[0]
        expect(result).toEqual(expected)
      })
      it('returns undefined on failure', () => {
        // send !== receive
        const result = getTransferByType(EthSend, TransferType.Receive)
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
