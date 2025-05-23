import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import { getTransfers, getTxType } from '@/hooks/useTxDetails/useTxDetails'
import { mockAssetState } from '@/test/mocks/assets'
import { createMockEthTxs, EthReceive, EthSend, TradeTx } from '@/test/mocks/txs'

const [deposit] = createMockEthTxs('foo')

describe('useTxDetails', () => {
  it('should get correct type for standard send', () => {
    const transfers = getTransfers(EthSend, mockAssetState().byId)
    const type = getTxType(EthSend, transfers)
    expect(type).toEqual(TransferType.Send)
  })

  it('should get correct type for a standard receive', () => {
    const transfers = getTransfers(EthReceive, mockAssetState().byId)
    const type = getTxType(EthReceive, transfers)
    expect(type).toEqual(TransferType.Receive)
  })

  it('should get correct type for a trade', () => {
    const transfers = getTransfers(TradeTx, mockAssetState().byId)
    const type = getTxType(TradeTx, transfers)
    expect(type).toEqual(TradeType.Trade)
  })

  it('should get correct type for a supported method', () => {
    const transfers = getTransfers(deposit, mockAssetState().byId)
    const type = getTxType(deposit, transfers)
    expect(type).toEqual('method')
  })

  it('should get correct type for a common tx', () => {
    const common = deposit
    if (!common.data) throw new Error('Unhandled rejection in tests')
    common.data.method = 'common'
    const transfers = getTransfers(common, mockAssetState().byId)
    const type = getTxType(common, transfers)
    expect(type).toEqual('common')
  })
})
