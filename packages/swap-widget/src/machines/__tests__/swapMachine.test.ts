import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import type { Asset, QuoteResponse, TradeRate } from '../../types'
import { formatAmountForInput } from '../../types'
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

const TEST_USDC: Asset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 'eip155:1',
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
}

const TEST_RATE: TradeRate = {
  swapperName: 'THORChain' as TradeRate['swapperName'],
  rate: '1500',
  buyAmountCryptoBaseUnit: '1500000000',
  sellAmountCryptoBaseUnit: '1000000000000000000',
  steps: 1,
  affiliateBps: '0',
  shapeshiftBps: '0',
}

const TEST_QUOTE_NO_APPROVAL = {
  transactionData: { to: '0xRouter', data: '0xSwapData', value: '1000000000000000000' },
} as unknown as QuoteResponse

const TEST_QUOTE_WITH_APPROVAL = {
  transactionData: { to: '0xRouter', data: '0xSwapData', value: '1000000000000000000' },
  approval: { isRequired: true, spender: '0xSpender' },
} as unknown as QuoteResponse

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

    it('SET_SELL_ASSET recalculates sellAmountBaseUnit with new precision', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '0.001',
        amountBaseUnit: '1000000000000000',
        fiatValue: '',
      })
      expect(actor.getSnapshot().context.sellAmountBaseUnit).toBe('1000000000000000')

      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      expect(actor.getSnapshot().context.sellAmountBaseUnit).toBe('100000')
      actor.stop()
    })

    it('SET_SELL_ASSET keeps sellAmountBaseUnit undefined when no sell amount', () => {
      const actor = createActor(swapMachine)
      actor.start()
      expect(actor.getSnapshot().context.sellAmountBaseUnit).toBeUndefined()

      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      expect(actor.getSnapshot().context.sellAmountBaseUnit).toBeUndefined()
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '2.5',
        amountBaseUnit: '2500000000000000000',
        fiatValue: '',
      })
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

    it('SET_SEND_ADDRESS updates sendAddress', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SEND_ADDRESS', address: '0xWallet' })
      expect(actor.getSnapshot().context.sendAddress).toBe('0xWallet')
      actor.stop()
    })

    it('SET_RECEIVE_ADDRESS updates receiveAddress', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_RECEIVE_ADDRESS', address: '0xReceiver' })
      expect(actor.getSnapshot().context.receiveAddress).toBe('0xReceiver')
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

  // Only one side can drive a trade, so the machine has to retire the other on every entry
  describe('exact output — buy amount exclusivity', () => {
    it('SET_BUY_AMOUNT clears the sell side', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1.5',
        amountBaseUnit: '1500000000000000000',
        fiatValue: '3000',
      })
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })

      const ctx = actor.getSnapshot().context
      expect(ctx.buyAmount).toBe('0.5')
      expect(ctx.buyAmountBaseUnit).toBe('500000')
      expect(ctx.sellAmount).toBe('')
      expect(ctx.sellAmountBaseUnit).toBeUndefined()
      expect(ctx.sellAmountFiat).toBe('')
      actor.stop()
    })

    it('SET_SELL_AMOUNT clears the buy side', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1.5',
        amountBaseUnit: '1500000000000000000',
        fiatValue: '',
      })

      const ctx = actor.getSnapshot().context
      expect(ctx.sellAmountBaseUnit).toBe('1500000000000000000')
      expect(ctx.buyAmount).toBe('')
      expect(ctx.buyAmountBaseUnit).toBeUndefined()
      actor.stop()
    })

    // A rate priced against the other side of the trade can't describe this one
    it('SET_SELL_AMOUNT drops a rate selected for the buy amount', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })
      actor.send({ type: 'SELECT_RATE', rate: TEST_RATE })
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1.5',
        amountBaseUnit: '1500000000000000000',
        fiatValue: '',
      })

      expect(actor.getSnapshot().context.selectedRate).toBeNull()
      actor.stop()
    })

    // The sell field is editable during exact output but shows a crypto amount, so a stale fiat mode
    // would have the next thing the user types read as dollars
    it('SET_BUY_AMOUNT leaves fiat entry mode', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })

      expect(actor.getSnapshot().context.isSellAmountFiat).toBe(false)
      actor.stop()
    })

    // The toggle picks a display unit, so it must never disturb either side's amount
    it('SET_SELL_FIAT_MODE leaves the buy amount untouched', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })
      actor.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })

      const ctx = actor.getSnapshot().context
      expect(ctx.isSellAmountFiat).toBe(true)
      expect(ctx.buyAmount).toBe('0.5')
      expect(ctx.buyAmountBaseUnit).toBe('500000')
      actor.stop()
    })

    // Base units mean nothing without the precision they were counted in, but the entered amount does
    it('SET_BUY_ASSET keeps the buy amount and recalculates its base units', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })
      actor.send({ type: 'SET_BUY_ASSET', asset: TEST_BTC })

      const ctx = actor.getSnapshot().context
      expect(ctx.buyAsset.symbol).toBe('BTC')
      expect(ctx.buyAmount).toBe('0.5')
      // 0.5 at BTC's 8 decimals, not USDC's 6
      expect(ctx.buyAmountBaseUnit).toBe('50000000')
      actor.stop()
    })

    // A seeded amount is re-parsed on a buy asset change, so a display-formatted one would zero out
    it('SET_BUY_ASSET recalculates a seeded amount large enough to carry separators', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_BUY_AMOUNT',
        amount: formatAmountForInput('1234500000', 6),
        amountBaseUnit: '1234500000',
      })
      actor.send({ type: 'SET_BUY_ASSET', asset: TEST_BTC })

      // 1234.5 at BTC's 8 decimals
      expect(actor.getSnapshot().context.buyAmountBaseUnit).toBe('123450000000')
      actor.stop()
    })

    it('clearing the buy amount returns the trade to the sell side', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '0.5', amountBaseUnit: '500000' })
      actor.send({ type: 'SET_BUY_AMOUNT', amount: '', amountBaseUnit: undefined })

      expect(actor.getSnapshot().context.buyAmountBaseUnit).toBeUndefined()
      actor.stop()
    })

    it('createInitialContext seeds a buy amount', () => {
      const ctx = createInitialContext({ buyAmount: '0.5', buyAmountBaseUnit: '500000' })
      expect(ctx.buyAmount).toBe('0.5')
      expect(ctx.buyAmountBaseUnit).toBe('500000')
    })
  })

  describe('input → quoting transition', () => {
    it('FETCH_QUOTE transitions to quoting when hasValidInput', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '0', amountBaseUnit: '0', fiatValue: '' })
      actor.send({ type: 'FETCH_QUOTE' })
      expect(actor.getSnapshot().value).toBe('input')
      actor.stop()
    })
  })

  describe('quoting state', () => {
    it('QUOTE_SUCCESS transitions to executing when no approval required', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')
      expect(actor.getSnapshot().context.quote).toEqual(TEST_QUOTE_NO_APPROVAL)
      actor.stop()
    })

    it('QUOTE_SUCCESS transitions to approval_needed when approval required on evm with ERC20', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('approval_needed')
      expect(actor.getSnapshot().context.quote).toEqual(TEST_QUOTE_WITH_APPROVAL)
      actor.stop()
    })

    it('QUOTE_SUCCESS skips approval for native assets even when API says required', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')
      actor.stop()
    })

    it('QUOTE_SUCCESS transitions to executing when approval required but non-evm chain', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '100000000',
        fiatValue: '',
      })
      actor.send({ type: 'FETCH_QUOTE' })
      actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_WITH_APPROVAL })
      expect(actor.getSnapshot().value).toBe('executing')
      actor.stop()
    })

    it('QUOTE_ERROR transitions to error with error message', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
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
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
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
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
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
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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

      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '',
      })
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

      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_USDC })
      actor.send({ type: 'SET_SELL_AMOUNT', amount: '1', amountBaseUnit: '1000000', fiatValue: '' })
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

  describe('fiat sell mode', () => {
    it('initial context defaults to crypto mode', () => {
      const ctx = createInitialContext()
      expect(ctx.isSellAmountFiat).toBe(false)
      expect(ctx.sellAmountFiat).toBe('')
    })

    it('SET_SELL_FIAT_MODE flips only the mode, leaving the amount untouched', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '1',
        amountBaseUnit: '1000000000000000000',
        fiatValue: '100',
      })
      actor.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })
      const { context } = actor.getSnapshot()
      expect(context.isSellAmountFiat).toBe(true)
      expect(context.sellAmount).toBe('1')
      expect(context.sellAmountBaseUnit).toBe('1000000000000000000')
      expect(context.sellAmountFiat).toBe('100')
      actor.stop()
    })

    it('SET_SELL_AMOUNT stores the fiat string alongside the crypto amount', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '0.03125',
        amountBaseUnit: '31250000000000000',
        fiatValue: '100',
      })
      const { context } = actor.getSnapshot()
      expect(context.sellAmount).toBe('0.03125')
      expect(context.sellAmountBaseUnit).toBe('31250000000000000')
      expect(context.sellAmountFiat).toBe('100')
      actor.stop()
    })

    it('clears stale crypto on sell asset change while in fiat mode, keeping the fiat string', () => {
      const actor = createActor(swapMachine)
      actor.start()
      actor.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })
      actor.send({
        type: 'SET_SELL_AMOUNT',
        amount: '0.03125',
        amountBaseUnit: '31250000000000000',
        fiatValue: '100',
      })
      actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
      const { context } = actor.getSnapshot()
      expect(context.sellAsset.symbol).toBe('BTC')
      expect(context.isSellAmountFiat).toBe(true)
      expect(context.sellAmountFiat).toBe('100')
      expect(context.sellAmount).toBe('')
      expect(context.sellAmountBaseUnit).toBeUndefined()
      actor.stop()
    })
  })
})

const TEST_DEPOSIT_QUOTE = {
  quoteId: 'quote-1',
  depositAddress: 'bc1qdeposit',
  expiresAt: 9_999_999_999_999,
  sellAsset: TEST_BTC,
  buyAsset: TEST_ETH,
  approval: { isRequired: false, spender: '', approvalTxs: [] },
} as unknown as QuoteResponse

const startInDepositQuoting = () => {
  const actor = createActor(swapMachine)
  actor.start()
  actor.send({ type: 'SET_SELL_ASSET', asset: TEST_BTC })
  actor.send({ type: 'SET_BUY_ASSET', asset: TEST_ETH })
  actor.send({
    type: 'SET_SELL_AMOUNT',
    amount: '0.1',
    amountBaseUnit: '10000000',
    fiatValue: '',
  })
  actor.send({ type: 'SET_SEND_ADDRESS', address: 'bc1qrefund' })
  actor.send({ type: 'FETCH_QUOTE', isDepositFlow: true })
  return actor
}

describe('deposit flow', () => {
  it('enters awaiting_deposit when the quote carries a deposit address', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    expect(actor.getSnapshot().value).toBe('awaiting_deposit')
    expect(actor.getSnapshot().context.quote?.depositAddress).toBe('bc1qdeposit')
    actor.stop()
  })

  it('errors instead of executing when a deposit quote has no deposit address', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_QUOTE_NO_APPROVAL })
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('error')
    expect(snapshot.context.errorSource).toBe('QUOTE_ERROR')
    actor.stop()
  })

  it('still executes with a wallet when the flow is not a deposit flow', () => {
    const actor = createActor(swapMachine)
    actor.start()
    actor.send({
      type: 'SET_SELL_AMOUNT',
      amount: '1',
      amountBaseUnit: '1000000000000000000',
      fiatValue: '',
    })
    actor.send({ type: 'FETCH_QUOTE' })
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    expect(actor.getSnapshot().value).toBe('executing')
    actor.stop()
  })

  it('moves to polling_status with the deposit hash on DEPOSIT_DETECTED', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'DEPOSIT_DETECTED', txHash: '0xdeposit' })
    expect(actor.getSnapshot().value).toBe('polling_status')
    expect(actor.getSnapshot().context.txHash).toBe('0xdeposit')
    actor.stop()
  })

  it('moves to deposit_expired when the window closes', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'DEPOSIT_EXPIRED' })
    expect(actor.getSnapshot().value).toBe('deposit_expired')
    actor.stop()
  })

  it('recovers from deposit_expired when a late deposit is detected', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'DEPOSIT_EXPIRED' })
    actor.send({ type: 'DEPOSIT_DETECTED', txHash: '0xlate' })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('polling_status')
    expect(snapshot.context.txHash).toBe('0xlate')
    actor.stop()
  })

  it('re-quotes for a fresh address from deposit_expired', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'DEPOSIT_EXPIRED' })
    actor.send({ type: 'RETRY' })
    expect(actor.getSnapshot().value).toBe('quoting')
    expect(actor.getSnapshot().context.isDepositFlow).toBe(true)
    actor.stop()
  })

  it('resets out of awaiting_deposit and clears the deposit flow', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'RESET' })
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('input')
    expect(snapshot.context.isDepositFlow).toBe(false)
    expect(snapshot.context.quote).toBeNull()
    actor.stop()
  })

  it('keeps the send address across a reset', () => {
    const actor = startInDepositQuoting()
    actor.send({ type: 'QUOTE_SUCCESS', quote: TEST_DEPOSIT_QUOTE })
    actor.send({ type: 'RESET' })
    expect(actor.getSnapshot().context.sendAddress).toBe('bc1qrefund')
    actor.stop()
  })

  const restoreDeposit = () => {
    const actor = createActor(swapMachine)
    actor.start()
    actor.send({
      type: 'RESTORE_DEPOSIT',
      quote: TEST_DEPOSIT_QUOTE,
      sendAddress: 'bc1qrefund',
      receiveAddress: '0xreceive',
      sellAmountBaseUnit: '10000000',
      buyAmountBaseUnit: undefined,
      txHash: undefined,
    })
    return actor
  }

  it('restores a persisted deposit straight into awaiting_deposit', () => {
    const actor = restoreDeposit()
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('awaiting_deposit')
    expect(snapshot.context.isDepositFlow).toBe(true)
    expect(snapshot.context.sendAddress).toBe('bc1qrefund')
    expect(snapshot.context.sellAsset.symbol).toBe('BTC')
    actor.stop()
  })

  it('restores the receive address, which the quote does not carry', () => {
    const actor = restoreDeposit()
    expect(actor.getSnapshot().context.receiveAddress).toBe('0xreceive')
    actor.stop()
  })

  it('restores chain flags describing the restored assets, not the defaults', () => {
    const actor = restoreDeposit()
    const { context } = actor.getSnapshot()
    expect(context.chainType).toBe('utxo')
    expect(context.isSellAssetUtxo).toBe(true)
    expect(context.isSellAssetEvm).toBe(false)
    expect(context.isBuyAssetEvm).toBe(true)
    actor.stop()
  })

  it('seeds the amount that drove the quote, so a re-quote has something to ask for', () => {
    const actor = restoreDeposit()
    const { context } = actor.getSnapshot()

    expect(context.sellAmountBaseUnit).toBe('10000000')
    expect(context.sellAmount).toBe('0.1')
    actor.stop()
  })

  it('carries the restored chain flags through a reset into the next swap', () => {
    const actor = restoreDeposit()
    actor.send({ type: 'RESET' })
    const { context } = actor.getSnapshot()
    expect(context.sellAsset.symbol).toBe('BTC')
    expect(context.chainType).toBe('utxo')
    expect(context.isSellAssetEvm).toBe(false)
    actor.stop()
  })
})

describe('restoring a deposit that was already funded', () => {
  const restoreWith = (txHash: string | undefined) => {
    const actor = createActor(swapMachine)
    actor.start()
    actor.send({
      type: 'RESTORE_DEPOSIT',
      quote: TEST_DEPOSIT_QUOTE,
      sendAddress: 'bc1qrefund',
      receiveAddress: '0xreceive',
      sellAmountBaseUnit: '10000000',
      buyAmountBaseUnit: undefined,
      txHash,
    })
    return actor
  }

  it('rejoins settlement rather than asking for the deposit again', () => {
    const actor = restoreWith('0xdead')
    expect(actor.getSnapshot().matches('polling_status')).toBe(true)
    expect(actor.getSnapshot().context.txHash).toBe('0xdead')
    actor.stop()
  })

  it('still awaits a deposit that was never seen', () => {
    const actor = restoreWith(undefined)
    expect(actor.getSnapshot().matches('awaiting_deposit')).toBe(true)
    expect(actor.getSnapshot().context.txHash).toBeNull()
    actor.stop()
  })
})
