import type { AssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { supplyMachine } from './supplyMachine'

const USDC_ASSET_ID = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as AssetId

const defaultSubmitEvent = {
  type: 'SUBMIT' as const,
  supplyAmountCryptoPrecision: '100.5',
  supplyAmountCryptoBaseUnit: '100500000',
}

const createTestActor = (overrides?: Partial<{ isNativeWallet: boolean }>) => {
  const actor = createActor(supplyMachine, {
    input: {
      assetId: USDC_ASSET_ID,
      isNativeWallet: overrides?.isNativeWallet ?? false,
    },
  })
  actor.start()
  return actor
}

describe('supplyMachine', () => {
  describe('initial state', () => {
    it('starts at input with correct default context', () => {
      const actor = createTestActor()
      const snapshot = actor.getSnapshot()

      expect(snapshot.value).toBe('input')
      expect(snapshot.context.assetId).toBe(USDC_ASSET_ID)
      expect(snapshot.context.isNativeWallet).toBe(false)
      expect(snapshot.context.supplyAmountCryptoPrecision).toBe('')
      expect(snapshot.context.supplyAmountCryptoBaseUnit).toBe('0')
      expect(snapshot.context.freeBalanceCryptoBaseUnit).toBe('0')
      expect(snapshot.context.stepConfirmed).toBe(false)
      expect(snapshot.context.txHash).toBeNull()
      expect(snapshot.context.lastUsedNonce).toBeUndefined()
      expect(snapshot.context.error).toBeNull()
      expect(snapshot.context.errorStep).toBeNull()
      expect(snapshot.context.initialLendingPositionCryptoBaseUnit).toBe('0')
    })

    it('passes isNativeWallet from input', () => {
      const actor = createTestActor({ isNativeWallet: true })
      expect(actor.getSnapshot().context.isNativeWallet).toBe(true)
    })
  })

  describe('input flow', () => {
    it('SUBMIT transitions to confirm with amounts stored', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)

      expect(actor.getSnapshot().value).toBe('confirm')
      expect(actor.getSnapshot().context.supplyAmountCryptoPrecision).toBe('100.5')
      expect(actor.getSnapshot().context.supplyAmountCryptoBaseUnit).toBe('100500000')
    })

    it('SUBMIT can overwrite previous amounts', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'BACK' })
      actor.send({
        type: 'SUBMIT',
        supplyAmountCryptoPrecision: '200',
        supplyAmountCryptoBaseUnit: '200000000',
      })

      expect(actor.getSnapshot().value).toBe('confirm')
      expect(actor.getSnapshot().context.supplyAmountCryptoPrecision).toBe('200')
      expect(actor.getSnapshot().context.supplyAmountCryptoBaseUnit).toBe('200000000')
    })
  })

  describe('confirm flow', () => {
    it('CONFIRM transitions to signing', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
    })

    it('BACK from confirm returns to input', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().value).toBe('input')
    })

    it('BACK from confirm preserves supply amounts in context', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().context.supplyAmountCryptoPrecision).toBe('100.5')
      expect(actor.getSnapshot().context.supplyAmountCryptoBaseUnit).toBe('100500000')
    })
  })

  describe('signing flow', () => {
    const goToSigning = (isNativeWallet = false) => {
      const actor = createTestActor({ isNativeWallet })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')
      return actor
    }

    it('entry resets stepConfirmed to false', () => {
      const actor = goToSigning()
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP sets stepConfirmed to true', () => {
      const actor = goToSigning(true)
      actor.send({ type: 'CONFIRM_STEP' })

      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('SIGN_BROADCASTED stores txHash and nonce', () => {
      const actor = goToSigning()
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xabc123', nonce: 5 })

      expect(actor.getSnapshot().context.txHash).toBe('0xabc123')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(5)
    })

    it('SIGN_SUCCESS transitions to confirming', () => {
      const actor = goToSigning()
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xabc', nonce: 1 })
      actor.send({ type: 'SIGN_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('confirming')
    })

    it('SIGN_SUCCESS without prior SIGN_BROADCASTED still transitions to confirming', () => {
      const actor = goToSigning()
      actor.send({ type: 'SIGN_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('confirming')
    })

    it('SIGN_ERROR transitions to error with correct errorStep', () => {
      const actor = goToSigning()
      actor.send({ type: 'SIGN_ERROR', error: 'user rejected' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('user rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('signing')
    })
  })

  describe('confirming flow', () => {
    const goToConfirming = () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsign', nonce: 1 })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')
      return actor
    }

    it('SUPPLY_CONFIRMED transitions to success', () => {
      const actor = goToConfirming()
      actor.send({ type: 'SUPPLY_CONFIRMED' })

      expect(actor.getSnapshot().value).toBe('success')
    })

    it('SUPPLY_TIMEOUT transitions to error with correct errorStep', () => {
      const actor = goToConfirming()
      actor.send({ type: 'SUPPLY_TIMEOUT', error: 'polling timed out' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('polling timed out')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')
    })
  })

  describe('success flow', () => {
    const goToSuccess = () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsign', nonce: 1 })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'SUPPLY_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
      return actor
    }

    it('DONE transitions back to input', () => {
      const actor = goToSuccess()
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().value).toBe('input')
    })

    it('DONE resets supply-specific context', () => {
      const actor = goToSuccess()
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.supplyAmountCryptoPrecision).toBe('')
      expect(ctx.supplyAmountCryptoBaseUnit).toBe('0')
      expect(ctx.txHash).toBeNull()
      expect(ctx.lastUsedNonce).toBeUndefined()
      expect(ctx.error).toBeNull()
      expect(ctx.errorStep).toBeNull()
    })

    it('DONE preserves assetId and isNativeWallet', () => {
      const actor = goToSuccess()
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.assetId).toBe(USDC_ASSET_ID)
      expect(ctx.isNativeWallet).toBe(false)
    })

    it('DONE preserves freeBalanceCryptoBaseUnit', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '5000000',
      })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'SUPPLY_CONFIRMED' })
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('5000000')
    })
  })

  describe('full happy path', () => {
    it('goes through all steps: input -> confirm -> signing -> confirming -> success -> done', () => {
      const actor = createTestActor()

      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')

      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsupply', nonce: 42 })
      expect(actor.getSnapshot().context.txHash).toBe('0xsupply')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(42)

      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'SUPPLY_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.supplyAmountCryptoPrecision).toBe('')
      expect(actor.getSnapshot().context.supplyAmountCryptoBaseUnit).toBe('0')
      expect(actor.getSnapshot().context.txHash).toBeNull()
      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })
  })

  describe('native wallet flow (CONFIRM_STEP)', () => {
    it('stepConfirmed resets on entry to signing', () => {
      const actor = createTestActor({ isNativeWallet: true })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP sets stepConfirmed to true in signing', () => {
      const actor = createTestActor({ isNativeWallet: true })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'CONFIRM_STEP' })

      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('native wallet can complete full flow with CONFIRM_STEP', () => {
      const actor = createTestActor({ isNativeWallet: true })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)

      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)

      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xnative', nonce: 1 })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'SUPPLY_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
    })
  })

  describe('error and retry', () => {
    it('SIGN_ERROR transitions to error with correct errorStep', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'user rejected' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('user rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('signing')
    })

    it('RETRY from signing error returns to signing', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'user rejected' })
      actor.send({ type: 'RETRY' })

      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('SUPPLY_TIMEOUT transitions to error and retries to confirming', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'SUPPLY_TIMEOUT', error: 'timed out' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('timed out')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('confirming')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('BACK from error returns to input and clears error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'rejected' })
      expect(actor.getSnapshot().value).toBe('error')

      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('retry preserves txHash from prior SIGN_BROADCASTED', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xfailed', nonce: 3 })
      actor.send({ type: 'SIGN_ERROR', error: 'extrinsic failed' })

      expect(actor.getSnapshot().context.txHash).toBe('0xfailed')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(3)

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.txHash).toBe('0xfailed')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(3)
    })
  })

  describe('SYNC_FREE_BALANCE', () => {
    it('updates freeBalanceCryptoBaseUnit from any state', () => {
      const actor = createTestActor()
      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('0')

      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '5000000',
      })

      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('5000000')
    })

    it('works during confirm state', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '9999999',
      })

      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('9999999')
    })

    it('works during signing state', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')

      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '1234567',
      })

      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('1234567')
    })

    it('can update multiple times', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '100',
      })
      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '200',
      })

      expect(actor.getSnapshot().context.freeBalanceCryptoBaseUnit).toBe('200')
    })
  })

  describe('SYNC_LENDING_POSITION', () => {
    it('updates initialLendingPositionCryptoBaseUnit from any state', () => {
      const actor = createTestActor()
      expect(actor.getSnapshot().context.initialLendingPositionCryptoBaseUnit).toBe('0')

      actor.send({
        type: 'SYNC_LENDING_POSITION',
        initialLendingPositionCryptoBaseUnit: '50000000',
      })

      expect(actor.getSnapshot().context.initialLendingPositionCryptoBaseUnit).toBe('50000000')
    })

    it('works during confirming state', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({
        type: 'SYNC_LENDING_POSITION',
        initialLendingPositionCryptoBaseUnit: '75000000',
      })

      expect(actor.getSnapshot().context.initialLendingPositionCryptoBaseUnit).toBe('75000000')
    })
  })

  describe('nonce tracking', () => {
    it('SIGN_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsign', nonce: 7 })

      expect(actor.getSnapshot().context.lastUsedNonce).toBe(7)
      expect(actor.getSnapshot().context.txHash).toBe('0xsign')
    })

    it('DONE resets lastUsedNonce to undefined', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsign', nonce: 42 })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'SUPPLY_CONFIRMED' })
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
    })
  })

  describe('tags', () => {
    it('signing has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('confirming has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('confirming')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('input state does not have executing tag', () => {
      const actor = createTestActor()
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('confirm state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)

      expect(actor.getSnapshot().value).toBe('confirm')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('success state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'SUPPLY_CONFIRMED' })

      expect(actor.getSnapshot().value).toBe('success')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('error state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'fail' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })
  })

  describe('resetForNewSupply', () => {
    it('DONE resets supply-specific context but preserves persistent state', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_FREE_BALANCE',
        freeBalanceCryptoBaseUnit: '8000000',
      })
      actor.send({
        type: 'SYNC_LENDING_POSITION',
        initialLendingPositionCryptoBaseUnit: '3000000',
      })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xsign', nonce: 10 })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'SUPPLY_CONFIRMED' })
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.supplyAmountCryptoPrecision).toBe('')
      expect(ctx.supplyAmountCryptoBaseUnit).toBe('0')
      expect(ctx.txHash).toBeNull()
      expect(ctx.lastUsedNonce).toBeUndefined()
      expect(ctx.error).toBeNull()
      expect(ctx.errorStep).toBeNull()

      expect(ctx.assetId).toBe(USDC_ASSET_ID)
      expect(ctx.isNativeWallet).toBe(false)
      expect(ctx.freeBalanceCryptoBaseUnit).toBe('8000000')
      expect(ctx.initialLendingPositionCryptoBaseUnit).toBe('3000000')
    })
  })
})
