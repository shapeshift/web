import { btcAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { strkbtcAssetId } from '../../constants'
import type { GardenOrder, GardenSwapState } from '../../types'
import {
  assetIdToGardenAssetId,
  isInsufficientLiquidityError,
  isNoRouteFoundError,
  isOutOfRangeError,
  isSupportedGardenPair,
  mapGardenOrderToTxStatus,
  slippageDecimalToBps,
} from './helpers'

const emptySwap = (overrides: Partial<GardenSwapState> = {}): GardenSwapState => ({
  created_at: '2026-05-15T00:00:00Z',
  swap_id: 'swap_id',
  chain: 'starknet',
  asset: 'starknet:strkbtc',
  initiator: '0x1',
  redeemer: '0x2',
  timelock: 43200,
  filled_amount: '0',
  asset_price: 79000,
  amount: '100000',
  secret_hash: '0xhash',
  secret: '',
  initiate_tx_hash: '',
  redeem_tx_hash: '',
  refund_tx_hash: '',
  initiate_block_number: '0',
  redeem_block_number: '0',
  refund_block_number: '0',
  required_confirmations: 1,
  current_confirmations: 0,
  initiate_timestamp: null,
  redeem_timestamp: null,
  refund_timestamp: null,
  ...overrides,
})

const buildOrder = (
  source: Partial<GardenSwapState>,
  destination: Partial<GardenSwapState>,
  overrides: Partial<GardenOrder> = {},
): GardenOrder => ({
  created_at: '2026-05-15T00:00:00Z',
  order_id: 'order_id',
  source_swap: emptySwap(source),
  destination_swap: emptySwap({ chain: 'bitcoin', asset: 'bitcoin:btc', ...destination }),
  nonce: '1',
  deadline: 0,
  affiliate_fees: [],
  ...overrides,
})

describe('GardenSwapper helpers', () => {
  describe('slippageDecimalToBps', () => {
    it('converts undefined to 0', () => {
      expect(slippageDecimalToBps(undefined)).toBe(0)
    })

    it('converts 0.005 (0.5%) to 50 bps', () => {
      expect(slippageDecimalToBps('0.005')).toBe(50)
    })

    it('converts 0.01 (1%) to 100 bps', () => {
      expect(slippageDecimalToBps('0.01')).toBe(100)
    })

    it('converts 0 to 0', () => {
      expect(slippageDecimalToBps('0')).toBe(0)
    })
  })

  describe('assetIdToGardenAssetId', () => {
    it('maps native BTC to bitcoin:btc', () => {
      expect(assetIdToGardenAssetId(btcAssetId)).toBe('bitcoin:btc')
    })

    it('maps the strkBTC ERC20 to starknet:strkbtc', () => {
      expect(assetIdToGardenAssetId(strkbtcAssetId)).toBe('starknet:strkbtc')
    })

    it('returns undefined for unsupported assets', () => {
      const ethAssetId = 'eip155:1/slip44:60'
      expect(assetIdToGardenAssetId(ethAssetId)).toBeUndefined()
    })

    it('returns undefined for other Starknet tokens', () => {
      const otherStarknetToken = `starknet:SN_MAIN/token:0x0000000000000000000000000000000000000001`
      expect(assetIdToGardenAssetId(otherStarknetToken)).toBeUndefined()
    })
  })

  describe('isSupportedGardenPair', () => {
    it('accepts BTC → strkBTC', () => {
      expect(isSupportedGardenPair(btcAssetId, strkbtcAssetId)).toBe(true)
    })

    it('accepts strkBTC → BTC', () => {
      expect(isSupportedGardenPair(strkbtcAssetId, btcAssetId)).toBe(true)
    })

    it('rejects same-asset pairs', () => {
      expect(isSupportedGardenPair(btcAssetId, btcAssetId)).toBe(false)
      expect(isSupportedGardenPair(strkbtcAssetId, strkbtcAssetId)).toBe(false)
    })

    it('rejects unsupported pairs', () => {
      const eth = 'eip155:1/slip44:60'
      expect(isSupportedGardenPair(btcAssetId, eth)).toBe(false)
      expect(isSupportedGardenPair(eth, strkbtcAssetId)).toBe(false)
    })
  })

  describe('mapGardenOrderToTxStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date('2026-05-15T12:00:00Z'))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns Confirmed with buyTxHash when destination_swap.redeem_tx_hash is set', () => {
      const order = buildOrder({}, { redeem_tx_hash: '0xredeem' })
      expect(mapGardenOrderToTxStatus(order)).toEqual({
        status: TxStatus.Confirmed,
        buyTxHash: '0xredeem',
      })
    })

    it('returns Failed with "Swap refunded" when source has a refund_tx_hash', () => {
      const order = buildOrder({ refund_tx_hash: '0xrefund' }, {})
      expect(mapGardenOrderToTxStatus(order)).toEqual({
        status: TxStatus.Failed,
        message: 'Swap refunded',
      })
    })

    it('returns Failed with "Swap refunded" when destination has a refund_tx_hash', () => {
      const order = buildOrder({}, { refund_tx_hash: '0xrefund' })
      expect(mapGardenOrderToTxStatus(order)).toEqual({
        status: TxStatus.Failed,
        message: 'Swap refunded',
      })
    })

    it('returns Failed with "Order expired" when deadline is in the past', () => {
      const order = buildOrder({}, {}, { deadline: 1000 })
      expect(mapGardenOrderToTxStatus(order)).toEqual({
        status: TxStatus.Failed,
        message: 'Order expired',
      })
    })

    it('returns Pending when nothing has settled yet', () => {
      const order = buildOrder({}, {})
      expect(mapGardenOrderToTxStatus(order)).toEqual({ status: TxStatus.Pending })
    })

    it('prioritises Confirmed over expired deadline', () => {
      const order = buildOrder({}, { redeem_tx_hash: '0xredeem' }, { deadline: 1000 })
      expect(mapGardenOrderToTxStatus(order).status).toBe(TxStatus.Confirmed)
    })
  })

  describe('error pattern matchers', () => {
    it('isNoRouteFoundError detects the blacklist message', () => {
      expect(isNoRouteFoundError('No order pair found : starknet:0x...:ethereum:0x...')).toBe(true)
      expect(isNoRouteFoundError('some other error')).toBe(false)
      expect(isNoRouteFoundError(undefined)).toBe(false)
    })

    it('isOutOfRangeError detects the min/max message', () => {
      expect(
        isOutOfRangeError(
          'Exact output quote error : expected amount to be within the range of 10000 to 500000000',
        ),
      ).toBe(true)
      expect(isOutOfRangeError('some other error')).toBe(false)
      expect(isOutOfRangeError(undefined)).toBe(false)
    })

    it('isInsufficientLiquidityError detects solver liquidity exhaustion', () => {
      expect(isInsufficientLiquidityError('insufficient liquidity')).toBe(true)
      expect(isInsufficientLiquidityError('Insufficient Liquidity for this route')).toBe(true)
      expect(isInsufficientLiquidityError('No order pair found')).toBe(false)
      expect(isInsufficientLiquidityError(undefined)).toBe(false)
    })
  })
})
