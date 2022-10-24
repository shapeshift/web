import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import { mockAssetState, usdc } from 'test/mocks/assets'
import { createMockEthTxs, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import { getTransfers, getTxType } from 'hooks/useTxDetails/useTxDetails'

const [deposit, , withdrawUsdc] = createMockEthTxs('foo')

const marketData = {} as Record<AssetId, MarketData | undefined>

describe('useTxDetails', () => {
  it('should get correct type for standard send', () => {
    const transfers = getTransfers(EthSend.transfers, mockAssetState().byId, marketData)
    const type = getTxType(EthSend, transfers)
    expect(type).toEqual(TransferType.Send)
  })

  it('should get correct type for a standard receive', () => {
    const transfers = getTransfers(EthReceive.transfers, mockAssetState().byId, marketData)
    const type = getTxType(EthReceive, transfers)
    expect(type).toEqual(TransferType.Receive)
  })

  it('should get correct type for a trade', () => {
    const transfers = getTransfers(TradeTx.transfers, mockAssetState().byId, marketData)
    const type = getTxType(TradeTx, transfers)
    expect(type).toEqual(TradeType.Trade)
  })

  it('should get correct type for a supported method', () => {
    const transfers = getTransfers(deposit.transfers, mockAssetState().byId, marketData)
    const type = getTxType(deposit, transfers)
    expect(type).toEqual('method')
  })

  it('should get correct type for an unknown tx', () => {
    const unknown = deposit
    unknown.data!.method = 'unknown'
    const transfers = getTransfers(unknown.transfers, mockAssetState().byId, marketData)
    const type = getTxType(unknown, transfers)
    expect(type).toEqual('unknown')
  })

  it('should filter transfers by active asset', () => {
    const transfers = getTransfers(withdrawUsdc.transfers, mockAssetState().byId, marketData, usdc)
    expect(transfers.length).toEqual(1)
    expect(transfers[0].asset).toEqual(usdc)
  })
})
