import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import type { Asset, QuoteResponse, TradeRate } from '../../types'
import { createInitialContext, swapMachine } from '../swapMachine'

const TEST_ETH: Asset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
}

const TEST_BTC: Asset = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  symbol: 'BTC',
  name: 'Bitcoin',
  precision: 8,
}

const TEST_RATE: TradeRate = {
  swapperName: 'THORChain' as TradeRate['swapperName'],
  rate: '1500',
  buyAmountCryptoBaseUnit: '1500000000',
  sellAmountCryptoBaseUnit: '1000000000000000000',
  steps: 1,
  affiliateBps: '0',
}

const TEST_QUOTE_NO_APPROVAL: QuoteResponse = {
  transactionData: { to: '0xRouter', data: '0xSwapData', value: '1000000000000000000' },
}

const TEST_QUOTE_WITH_APPROVAL: QuoteResponse = {
  transactionData: { to: '0xRouter', data: '0xSwapData', value: '1000000000000000000' },
  approval: { isRequired: true, spender: '0xSpender' },
}

describe('swapMachine', () => {
  describe('initial state', () => {
    it('starts in idle and auto-transitions to input', () => {
      const actor = createActor(swapMachine)
      actor.start()
      const snapshot = actor.getSnapshot()
      expect(snapshot.value).toBe('input')
      actor.stop()
    })

    it('has correct initial context', () => {
      const actor = createActor(swapMachine)
      actor.start()
      const ctx = actor.getSnapshot().context
      expect(ctx.sellAsset.symbol).toBe('ETH')
      expect(ctx.buyAsset.symbol).toBe('USDC')
      expect(ctx.sellAmount).toBe('')
      expect(ctx.sellAmountBaseUnit).toBeUndefined()
      expect(ctx.selectedRate).toBeNull()
      expect(ctx.quote).toBeNull()
      expect(ctx.txHash).toBeNull()
      expect(ctx.approvalTxHash).toBeNull()
      expect(ctx.error).toBeNull()
      expect(ctx.retryCount).toBe(0)
      expect(ctx.chainType).toBe('evm')
      expect(ctx.slippage).toBe('0.5')
      expect(ctx.isSellAssetEvm).toBe(true)
      expect(ctx.isSellAssetUtxo).toBe(false)
      expect(ctx.isSellAssetSolana).toBe(false)
      expect(ctx.isBuyAssetEvm).toBe(true)
      actor.stop()
    })
  })

  describe('input state — context update events', () => {
    it('SET_SELL_ASSET updates sellAsset and chain flags', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      const ctx = actor.getSnapshot().context
      expect(ctx.sellAsset.symbol).toBe('BTC')
      expect(ctx.chainType).toBe('utxo')
      expect(ctx.isSellAssetEvm).toBe(false)
      expect(ctx.isSellAssetUtxo).toBe(true)
      expect(ctx.isSellAssetSolana).toBe(false)
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })

    it('SET_BUY_ASSET updates buyAsset and isBuyAssetEvm', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_ASSET', asset: TEST_BTC })
      const ctx = actor.getSnapshot().context
      expect(ctx.buyAsset.symbol).toBe('BTC')
      expect(ctx.isBuyAssetEvm).toBe(false)
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })

    it('SET_SELL_AMOUNT updates sellAmount and sellAmountBaseUnit', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '2.5', amountBaseUnit: '2500000000000000000' })
      const ctx = actor.getSnapshot().context
      expect(ctx.sellAmount).toBe('2.5')
      expect(ctx.sellAmountBaseUnit).toBe('2500000000000000000')
      actor.stop()
    })

    it('SET_SLIPPAGE updates slippage', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SLIPPAGE', slippage: '1.0' })
      expect(actor.getSnapshot().context.slippage).toBe('1.0')
      actor.stop()
    })

    it('SELECT_RATE updates selectedRate', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SELECT_RATE', rate: TEST_RATE })
      expect(actor.getSnapshot().context.selectedRate).toEqual(TEST_RATE)
      actor.stop()
    })

    it('SET_WALLET_ADDRESS updates walletAddress', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_WALLET_ADDRESS', address: '0xWallet' })
      expect(actor.getSnapshot().context.walletAddress).toBe('0xWallet')
      actor.stop()
    })

    it('SET_RECEIVE_ADDRESS updates effectiveReceiveAddress', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_RECEIVE_ADDRESS', address: '0xReceiver' })
      expect(actor.getSnapshot().context.effectiveReceiveAddress).toBe('0xReceiver')
      actor.stop()
    })

    it('UPDATE_CHAIN_INFO updates all chain flags', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'UPDATE_CHAIN_INFO',
        chainType: 'utxo',
        isSellAssetEvm: false,
        isSellAssetUtxo: true,
        isSellAssetSolana: false,
        isBuyAssetEvm: false,
      })
      const ctx = actor.getSnapshot().context
      expect(ctx.chainType).toBe('utxo')
      expect(ctx.isSellAssetEvm).toBe(false)
      expect(ctx.isSellAssetUtxo).toBe(true)
      expect(ctx.isBuyAssetEvm).toBe(false)
      actor.stop()
    })
  })

  describe('input → quoting transition', () => {
    it('FETCH_QUOTE transitions to quoting when hasValidInput', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('quoting')
      actor.stop()
    })

    it('FETCH_QUOTE stays in input when no valid input', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })

    it('FETCH_QUOTE stays in input when sellAmountBaseUnit is "0"', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '0', amountBaseUnit: '0' })
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })
  })

  describe('quoting state', () => {
    it('QUOTE_SUCCESS transitions to executing when no approval required', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.quote).toEqual(TEST_QUOTE_NO_APPROVAL)
      actor.stop()
    })

    it('QUOTE_SUCCESS transitions to approval_needed when approval required on evm', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('approval_needed')
      expect(actor.getSnapshot().context.quote).toEqual(TEST_QUOTE_WITH_APPROVAL)
      actor.stop()
    })

    it('QUOTE_SUCCESS transitions to executing when approval required but non-evm chain', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '100000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')
      actor.stop()
    })

    it('QUOTE_ERROR transitions to error with error message', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_ERROR', error: 'No quotes available' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('No quotes available')
      actor.stop()
    })
  })

  describe('approval_needed → approving', () => {
    it('APPROVE transitions to approving', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('approval_needed')
      actor.send({ type: 'APPROVE' })
      expect(actor.getSnapshot().value).toBe('approving')
      actor.stop()
    })

    it('RESET from approval_needed goes to input', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      actor.send({ type: 'RESET' })
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })
  })

  describe('approving state', () => {
    it('APPROVAL_SUCCESS transitions to executing with approvalTxHash', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      actor.send({ type: 'APPROVE' })
      actor.send({ type: 'APPROVAL_SUCCESS', txHash: '0xApprovalHash' })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.approvalTxHash).toBe('0xApprovalHash')
      actor.stop()
    })

    it('APPROVAL_ERROR transitions to error', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      actor.send({ type: 'APPROVE' })
      actor.send({ type: 'APPROVAL_ERROR', error: 'User rejected' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('User rejected')
      actor.stop()
    })
  })

  describe('executing state', () => {
    it('EXECUTE_SUCCESS transitions to polling_status with txHash', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xTxHash' })
      expect(actor.getSnapshot().value).toBe('polling_status')
      expect(actor.getSnapshot().context.txHash).toBe('0xTxHash')
      actor.stop()
    })

    it('EXECUTE_ERROR transitions to error', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_ERROR', error: 'Transaction failed' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('Transaction failed')
      actor.stop()
    })
  })

  describe('polling_status state', () => {
    it('STATUS_CONFIRMED transitions to complete', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xTxHash' })
      actor.send({ type: 'STATUS_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('complete')
      actor.stop()
    })

    it('STATUS_FAILED transitions to error', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xTxHash' })
      actor.send({ type: 'STATUS_FAILED', error: 'Transaction reverted' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('Transaction reverted')
      actor.stop()
    })
  })

  describe('error state', () => {
    it('RETRY transitions to executing and increments retryCount', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_ERROR', error: 'Gas too low' })
      expect(actor.getSnapshot().context.retryCount).toBe(0)
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.retryCount).toBe(1)
      expect(actor.getSnapshot().context.error).toBeNull()
      actor.stop()
    })

    it('RETRY works up to 3 times then stays in error', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })

      actor.send({ type: 'EXECUTE_ERROR', error: 'fail 1' })
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.retryCount).toBe(1)

      actor.send({ type: 'EXECUTE_ERROR', error: 'fail 2' })
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.retryCount).toBe(2)

      actor.send({ type: 'EXECUTE_ERROR', error: 'fail 3' })
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.retryCount).toBe(3)

      actor.send({ type: 'EXECUTE_ERROR', error: 'fail 4' })
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.retryCount).toBe(3)
      actor.stop()
    })

    it('RESET from error transitions to input and resets context', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_ERROR', error: 'Some error' })
      actor.send({ type: 'RESET' })
      const ctx = actor.getSnapshot().context
      expect(actor.getSnapshot().value).toBe('input')
      expect(ctx.error).toBeNull()
      expect(ctx.quote).toBeNull()
      expect(ctx.txHash).toBeNull()
      expect(ctx.retryCount).toBe(0)
      actor.stop()
    })
  })

  describe('complete state', () => {
    it('RESET from complete transitions to input and resets context', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xTxHash' })
      actor.send({ type: 'STATUS_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('complete')
      actor.send({ type: 'RESET' })
      const ctx = actor.getSnapshot().context
      expect(actor.getSnapshot().value).toBe('input')
      expect(ctx.txHash).toBeNull()
      expect(ctx.quote).toBeNull()
      expect(ctx.retryCount).toBe(0)
      actor.stop()
    })
  })

  describe('createInitialContext', () => {
    it('returns default context without input', () => {
      const ctx = createInitialContext()
      expect(ctx.sellAsset.symbol).toBe('ETH')
      expect(ctx.buyAsset.symbol).toBe('USDC')
      expect(ctx.slippage).toBe('0.5')
      expect(ctx.chainType).toBe('evm')
    })

    it('accepts custom sell/buy assets', () => {
      const ctx = createInitialContext({ sellAsset: TEST_BTC, buyAsset: TEST_ETH })
      expect(ctx.sellAsset.symbol).toBe('BTC')
      expect(ctx.buyAsset.symbol).toBe('ETH')
      expect(ctx.chainType).toBe('utxo')
    })

    it('accepts custom slippage', () => {
      const ctx = createInitialContext({ slippage: '2.0' })
      expect(ctx.slippage).toBe('2.0')
    })
  })

  describe('full happy path — no approval', () => {
    it('idle → input → quoting → executing → polling_status → complete → input', () => {
      const actor = createActor(swapMachine)
      actor.start()
      expect(actor.getSnapshot().value).toBe('input')

      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('quoting')

      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')

      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xHash' })
      expect(actor.getSnapshot().value).toBe('polling_status')

      actor.send({ type: 'STATUS_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('complete')

      actor.send({ type: 'RESET' })
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })
  })

  describe('full happy path — with approval', () => {
    it('idle → input → quoting → approval_needed → approving → executing → polling_status → complete', () => {
      const actor = createActor(swapMachine)
      actor.start()
      expect(actor.getSnapshot().value).toBe('input')

      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000000000000000' })
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('quoting')

      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('approval_needed')

      actor.send({ type: 'APPROVE' })
      expect(actor.getSnapshot().value).toBe('approving')

      actor.send({ type: 'APPROVAL_SUCCESS', txHash: '0xApproval' })
      expect(actor.getSnapshot().value).toBe('executing')

      actor.send({ type: 'EXECUTE_SUCCESS', txHash: '0xSwap' })
      expect(actor.getSnapshot().value).toBe('polling_status')

      actor.send({ type: 'STATUS_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('complete')
      actor.stop()
    })
  })
})
