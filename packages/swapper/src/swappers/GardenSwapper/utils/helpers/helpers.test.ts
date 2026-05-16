import { btcAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import type { GardenOrder, GardenSwapState } from '../../types'
import {
  assetIdToGardenAssetId,
  isInsufficientLiquidityError,
  isNoRouteFoundError,
  isOutOfRangeError,
  isSupportedGardenPair,
  mapGardenOrderToTxStatus,
} from './helpers'

const strkbtcAssetId =
  'starknet:SN_MAIN/token:0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135'

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
  affiliate_fees: [],
  ...overrides,
})

describe('GardenSwapper helpers', () => {
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

    it('rejects Solana as the source chain even when the registry has the asset', () => {
      const solanaSol = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501'
      expect(isSupportedGardenPair(solanaSol, btcAssetId)).toBe(false)
    })

    it('rejects Tron as the source chain even when the registry has the asset', () => {
      const tronUsdt = 'tron:0x2b6653dc/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
      expect(isSupportedGardenPair(tronUsdt, btcAssetId)).toBe(false)
    })

    it('still accepts Solana as the destination chain', () => {
      const solanaCbbtc =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij'
      expect(isSupportedGardenPair(btcAssetId, solanaCbbtc)).toBe(true)
    })
  })

  describe('mapGardenOrderToTxStatus', () => {
    it('returns Confirmed with buyTxHash + actualBuyAmount when destination_swap.redeem_tx_hash is set', () => {
      const order = buildOrder({}, { redeem_tx_hash: '0xredeem', filled_amount: '99500' })
      expect(mapGardenOrderToTxStatus(order)).toEqual({
        status: TxStatus.Confirmed,
        buyTxHash: '0xredeem',
        actualBuyAmountCryptoBaseUnit: '99500',
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

    it('returns Pending when nothing has settled yet', () => {
      const order = buildOrder({}, {})
      expect(mapGardenOrderToTxStatus(order)).toEqual({ status: TxStatus.Pending })
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
