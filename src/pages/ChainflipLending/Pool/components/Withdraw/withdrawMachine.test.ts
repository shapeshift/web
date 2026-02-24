import type { AssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { withdrawMachine } from './withdrawMachine'

const USDC_ASSET_ID = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as AssetId

const defaultSubmitEvent = {
  type: 'SUBMIT' as const,
  withdrawAmountCryptoPrecision: '100.5',
  withdrawAmountCryptoBaseUnit: '100500000',
  withdrawAddress: '0xwithdrawaddr',
}

const createTestActor = (overrides?: Partial<{ isNativeWallet: boolean }>) => {
  const actor = createActor(withdrawMachine, {
    input: {
      assetId: USDC_ASSET_ID,
      isNativeWallet: overrides?.isNativeWallet ?? false,
    },
  })
  actor.start()
  return actor
}

describe('withdrawMachine', () => {
  describe('initial state', () => {
    it('starts at input with correct default context', () => {
      const actor = createTestActor()
      const snapshot = actor.getSnapshot()

      expect(snapshot.value).toBe('input')
      expect(snapshot.context.assetId).toBe(USDC_ASSET_ID)
      expect(snapshot.context.isNativeWallet).toBe(false)
      expect(snapshot.context.withdrawAmountCryptoPrecision).toBe('')
      expect(snapshot.context.withdrawAmountCryptoBaseUnit).toBe('0')
      expect(snapshot.context.supplyPositionCryptoBaseUnit).toBe('0')
      expect(snapshot.context.withdrawAddress).toBe('')
      expect(snapshot.context.stepConfirmed).toBe(false)
      expect(snapshot.context.txHashes).toEqual({})
      expect(snapshot.context.lastUsedNonce).toBeUndefined()
      expect(snapshot.context.error).toBeNull()
      expect(snapshot.context.errorStep).toBeNull()
      expect(snapshot.context.useBatch).toBe(true)
    })

    it('passes isNativeWallet from input', () => {
      const actor = createTestActor({ isNativeWallet: true })
      expect(actor.getSnapshot().context.isNativeWallet).toBe(true)
    })
  })

  describe('input flow', () => {
    it('SUBMIT transitions to confirm with amounts and address stored', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)

      expect(actor.getSnapshot().value).toBe('confirm')
      expect(actor.getSnapshot().context.withdrawAmountCryptoPrecision).toBe('100.5')
      expect(actor.getSnapshot().context.withdrawAmountCryptoBaseUnit).toBe('100500000')
      expect(actor.getSnapshot().context.withdrawAddress).toBe('0xwithdrawaddr')
    })
  })

  describe('confirm flow', () => {
    it('CONFIRM with useBatch=true transitions to signing_batch', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing_batch')
    })

    it('CONFIRM with useBatch=false transitions to signing_remove', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({ type: 'BATCH_ERROR', error: 'batch not supported' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().context.useBatch).toBe(false)

      actor.send({ type: 'REMOVE_ERROR', error: 'user rejected' })
      expect(actor.getSnapshot().value).toBe('error')

      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().value).toBe('input')

      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
    })

    it('BACK from confirm returns to input', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().value).toBe('input')
    })
  })

  describe('batch happy path', () => {
    it('signing_batch -> BATCH_SUCCESS -> confirming -> WITHDRAW_CONFIRMED -> success', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.batch).toBe('0xbatch')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)

      actor.send({ type: 'BATCH_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
    })
  })

  describe('batch fallback to sequential', () => {
    it('BATCH_ERROR transitions to signing_remove and sets useBatch to false', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({ type: 'BATCH_ERROR', error: 'batch not supported' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().context.useBatch).toBe(false)
    })
  })

  describe('sequential happy path', () => {
    it('signing_remove -> REMOVE_SUCCESS -> signing_egress -> EGRESS_SUCCESS -> confirming -> success', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      expect(actor.getSnapshot().value).toBe('signing_remove')

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xremove', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.remove).toBe('0xremove')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)

      actor.send({ type: 'REMOVE_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('signing_egress')

      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xegress', nonce: 2 })
      expect(actor.getSnapshot().context.txHashes.egress).toBe('0xegress')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(2)

      actor.send({ type: 'EGRESS_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
    })
  })

  describe('error and retry', () => {
    it('REMOVE_ERROR transitions to error with correct errorStep', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      expect(actor.getSnapshot().value).toBe('signing_remove')

      actor.send({ type: 'REMOVE_ERROR', error: 'user rejected' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('user rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('signing_remove')
    })

    it('RETRY from signing_remove error returns to signing_remove', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_ERROR', error: 'user rejected' })

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('EGRESS_ERROR transitions to error with correct errorStep', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('signing_egress')

      actor.send({ type: 'EGRESS_ERROR', error: 'rpc error' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('rpc error')
      expect(actor.getSnapshot().context.errorStep).toBe('signing_egress')
    })

    it('RETRY from signing_egress error returns to signing_egress', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })
      actor.send({ type: 'EGRESS_ERROR', error: 'rpc error' })

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing_egress')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('WITHDRAW_TIMEOUT transitions to error with correct errorStep', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_TIMEOUT', error: 'polling timed out' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('polling timed out')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')
    })

    it('RETRY from confirming error returns to confirming', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_SUCCESS' })
      actor.send({ type: 'WITHDRAW_TIMEOUT', error: 'timeout' })

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('confirming')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('BACK from error returns to input and clears error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_ERROR', error: 'rejected' })
      expect(actor.getSnapshot().value).toBe('error')

      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })
  })

  describe('CONFIRM_STEP / stepConfirmed / resetStepConfirmed', () => {
    it('entry to signing_batch resets stepConfirmed to false', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing_batch')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP sets stepConfirmed to true in signing_batch', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'CONFIRM_STEP' })

      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('stepConfirmed resets when transitioning from signing_batch to signing_remove on error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)

      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('stepConfirmed resets when transitioning from signing_remove to signing_egress', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)

      actor.send({ type: 'REMOVE_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('signing_egress')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP works in signing_remove', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      expect(actor.getSnapshot().value).toBe('signing_remove')

      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('CONFIRM_STEP works in signing_egress', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('signing_egress')

      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })
  })

  describe('SYNC_SUPPLY_POSITION', () => {
    it('updates supplyPositionCryptoBaseUnit from any state', () => {
      const actor = createTestActor()

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('0')

      actor.send({
        type: 'SYNC_SUPPLY_POSITION',
        supplyPositionCryptoBaseUnit: '500000000',
      })

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('500000000')
    })

    it('works during confirm state', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({
        type: 'SYNC_SUPPLY_POSITION',
        supplyPositionCryptoBaseUnit: '999000000',
      })

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('999000000')
    })

    it('works during signing states', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({
        type: 'SYNC_SUPPLY_POSITION',
        supplyPositionCryptoBaseUnit: '123456',
      })

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('123456')
    })
  })

  describe('nonce tracking', () => {
    it('BATCH_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch', nonce: 5 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(5)
      expect(actor.getSnapshot().context.txHashes.batch).toBe('0xbatch')
    })

    it('REMOVE_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xremove', nonce: 7 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(7)
      expect(actor.getSnapshot().context.txHashes.remove).toBe('0xremove')
    })

    it('EGRESS_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })

      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xegress', nonce: 10 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(10)
      expect(actor.getSnapshot().context.txHashes.egress).toBe('0xegress')
    })

    it('nonces increment across sequential steps', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xremove', nonce: 1 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)

      actor.send({ type: 'REMOVE_SUCCESS' })

      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xegress', nonce: 2 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(2)
    })

    it('DONE resets lastUsedNonce to undefined', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch', nonce: 42 })
      actor.send({ type: 'BATCH_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
    })
  })

  describe('tx hash tracking', () => {
    it('BATCH_BROADCASTED assigns batch tx hash', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch123', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.batch).toBe('0xbatch123')
    })

    it('REMOVE_BROADCASTED assigns remove tx hash', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xremove456', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.remove).toBe('0xremove456')
    })

    it('EGRESS_BROADCASTED assigns egress tx hash', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })

      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xegress789', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.egress).toBe('0xegress789')
    })

    it('tx hashes accumulate across sequential steps', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xr', nonce: 1 })
      actor.send({ type: 'REMOVE_SUCCESS' })
      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xe', nonce: 2 })

      const txHashes = actor.getSnapshot().context.txHashes
      expect(txHashes.remove).toBe('0xr')
      expect(txHashes.egress).toBe('0xe')
    })
  })

  describe('tags', () => {
    it('signing_batch has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing_batch')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('signing_remove has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })

      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('signing_egress has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('signing_egress')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('confirming has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_SUCCESS' })

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
      actor.send({ type: 'BATCH_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })

      expect(actor.getSnapshot().value).toBe('success')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('error state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_ERROR', error: 'fallback' })
      actor.send({ type: 'REMOVE_ERROR', error: 'fail' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })
  })

  describe('full happy path (batch)', () => {
    it('goes through: input -> confirm -> signing_batch -> confirming -> success -> done', () => {
      const actor = createTestActor()

      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.batch).toBe('0xbatch')
      actor.send({ type: 'BATCH_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.withdrawAmountCryptoPrecision).toBe('')
      expect(actor.getSnapshot().context.withdrawAmountCryptoBaseUnit).toBe('0')
      expect(actor.getSnapshot().context.withdrawAddress).toBe('')
      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
      expect(actor.getSnapshot().context.txHashes).toEqual({})
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
      expect(actor.getSnapshot().context.useBatch).toBe(true)
    })
  })

  describe('full happy path (sequential fallback)', () => {
    it('goes through: input -> confirm -> signing_batch -> signing_remove -> signing_egress -> confirming -> success -> done', () => {
      const actor = createTestActor()

      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing_batch')

      actor.send({ type: 'BATCH_ERROR', error: 'batch not supported' })
      expect(actor.getSnapshot().value).toBe('signing_remove')
      expect(actor.getSnapshot().context.useBatch).toBe(false)

      actor.send({ type: 'REMOVE_BROADCASTED', txHash: '0xremove', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.remove).toBe('0xremove')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)
      actor.send({ type: 'REMOVE_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('signing_egress')

      actor.send({ type: 'EGRESS_BROADCASTED', txHash: '0xegress', nonce: 2 })
      expect(actor.getSnapshot().context.txHashes.egress).toBe('0xegress')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(2)
      actor.send({ type: 'EGRESS_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.useBatch).toBe(true)
    })
  })

  describe('resetForNewWithdraw', () => {
    it('DONE resets withdraw-specific context but preserves assetId and isNativeWallet', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_SUPPLY_POSITION',
        supplyPositionCryptoBaseUnit: '500000000',
      })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'BATCH_BROADCASTED', txHash: '0xbatch', nonce: 1 })
      actor.send({ type: 'BATCH_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.withdrawAmountCryptoPrecision).toBe('')
      expect(ctx.withdrawAmountCryptoBaseUnit).toBe('0')
      expect(ctx.withdrawAddress).toBe('')
      expect(ctx.lastUsedNonce).toBeUndefined()
      expect(ctx.txHashes).toEqual({})
      expect(ctx.error).toBeNull()
      expect(ctx.errorStep).toBeNull()
      expect(ctx.useBatch).toBe(true)

      expect(ctx.assetId).toBe(USDC_ASSET_ID)
      expect(ctx.isNativeWallet).toBe(false)
      expect(ctx.supplyPositionCryptoBaseUnit).toBe('500000000')
    })
  })
})
