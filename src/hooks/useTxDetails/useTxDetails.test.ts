import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
import { renderHook } from '@testing-library/react'
import { ethereum, mockAssetState, usdc } from 'test/mocks/assets'
import { createMockEthTxs, EthReceive, EthSend, TradeTx } from 'test/mocks/txs'
import { useTxDetails } from 'hooks/useTxDetails/useTxDetails'
import * as store from 'state/store'

const [deposit, , withdrawUsdc] = createMockEthTxs('foo')

const useSelectorSpy = jest.spyOn(store, 'useAppSelector')

const marketData = {} as Record<AssetId, MarketData | undefined>

describe('useTxDetails', () => {
  it('should get tx details for a standard send', () => {
    useSelectorSpy.mockReturnValueOnce(EthSend) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(EthSend.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.type).toEqual(TransferType.Send)
  })

  it('should get tx details for a standard receive', () => {
    useSelectorSpy.mockReturnValueOnce(EthReceive) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(EthReceive.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.type).toEqual(TransferType.Receive)
  })

  it('should get tx details for a trade', () => {
    useSelectorSpy.mockReturnValueOnce(TradeTx) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(TradeTx.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.type).toEqual(TradeType.Trade)
  })

  it('should get tx details for a supported method', () => {
    useSelectorSpy.mockReturnValueOnce(deposit) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(deposit.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.type).toEqual('method')
  })

  it('should get tx details for an unknown tx type', () => {
    const unknown = deposit
    unknown.data!.method = 'unknown'

    useSelectorSpy.mockReturnValueOnce(unknown) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(unknown.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.type).toEqual('unknown')
  })

  it('should get tx details for an active asset', () => {
    useSelectorSpy.mockReturnValueOnce(withdrawUsdc) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(withdrawUsdc.txid, mockAssetState().byId, marketData, usdc),
    )

    expect(result.current.transfers.length).toEqual(1)
    expect(result.current.transfers[0].asset).toEqual(usdc)
  })

  it('should use default fee asset', () => {
    const invalidFeeAsset = EthSend
    invalidFeeAsset.fee!.assetId = 'foo'

    useSelectorSpy.mockReturnValueOnce(invalidFeeAsset) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() =>
      useTxDetails(invalidFeeAsset.txid, mockAssetState().byId, marketData),
    )

    expect(result.current.fee?.asset).toEqual(ethereum)
  })

  it('should use default explorer tx link', () => {
    const noFee = EthSend
    delete noFee.fee

    useSelectorSpy.mockReturnValueOnce(noFee) // selectTxById
    useSelectorSpy.mockReturnValueOnce(ethereum) // selectFeeAssetByChainId

    const { result } = renderHook(() => useTxDetails(noFee.txid, mockAssetState().byId, marketData))

    expect(result.current.explorerTxLink).toEqual('https://etherscan.io/tx/')
  })
})
