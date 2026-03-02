import type { AssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { withdrawMachine } from './withdrawMachine'

const USDC_ASSET_ID = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as AssetId

const defaultSubmitEvent = {
  type: 'SUBMIT' as const,
  withdrawAmountCryptoPrecision: '100.5',
  withdrawAmountCryptoBaseUnit: '100500000',
  isFullWithdrawal: false,
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
      expect(snapshot.context.stepConfirmed).toBe(false)
      expect(snapshot.context.txHash).toBeNull()
      expect(snapshot.context.lastUsedNonce).toBeUndefined()
      expect(snapshot.context.error).toBeNull()
      expect(snapshot.context.errorStep).toBeNull()
    })

    it('passes isNativeWallet from input', () => {
      const actor = createTestActor({ isNativeWallet: true })
      expect(actor.getSnapshot().context.isNativeWallet).toBe(true)
    })
  })

  describe('input -> confirm', () => {
    it('SUBMIT transitions to confirm with amounts stored', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)

      expect(actor.getSnapshot().value).toBe('confirm')
      expect(actor.getSnapshot().context.withdrawAmountCryptoPrecision).toBe('100.5')
      expect(actor.getSnapshot().context.withdrawAmountCryptoBaseUnit).toBe('100500000')
    })

    it('sets isFullWithdrawal flag', () => {
      const actor = createTestActor()
      actor.send({ ...defaultSubmitEvent, isFullWithdrawal: true })
      expect(actor.getSnapshot().context.isFullWithdrawal).toBe(true)
    })
  })

  describe('confirm -> signing', () => {
    it('transitions to signing on CONFIRM', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().value).toBe('signing')
    })

    it('goes back to input on BACK', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().value).toBe('input')
    })
  })

  describe('signing', () => {
    it('has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('stores txHash and nonce on SIGN_BROADCASTED', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xabc', nonce: 5 })

      expect(actor.getSnapshot().context.txHash).toBe('0xabc')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(5)
    })

    it('transitions to confirming on SIGN_SUCCESS', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('confirming')
    })

    it('transitions to error on SIGN_ERROR', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'User rejected' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('User rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('signing')
    })

    it('handles CONFIRM_STEP for native wallet', () => {
      const actor = createTestActor({ isNativeWallet: true })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })

      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('resets stepConfirmed on entry', () => {
      const actor = createTestActor({ isNativeWallet: true })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)

      actor.send({ type: 'SIGN_ERROR', error: 'fail' })
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })
  })

  describe('confirming', () => {
    it('has executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })

      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('transitions to success on WITHDRAW_CONFIRMED', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })

      expect(actor.getSnapshot().value).toBe('success')
    })

    it('transitions to error on WITHDRAW_TIMEOUT', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_TIMEOUT', error: 'Timed out' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('Timed out')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')
    })
  })

  describe('success', () => {
    it('resets and returns to input on DONE', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.withdrawAmountCryptoPrecision).toBe('')
      expect(actor.getSnapshot().context.txHash).toBeNull()
      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
    })
  })

  describe('error recovery', () => {
    it('retries signing from signing error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'failed' })

      expect(actor.getSnapshot().value).toBe('error')
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.error).toBeNull()
    })

    it('retries confirming from confirming error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_TIMEOUT', error: 'timeout' })

      expect(actor.getSnapshot().value).toBe('error')
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('confirming')
      expect(actor.getSnapshot().context.error).toBeNull()
    })

    it('goes back to input on BACK from error', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'failed' })
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.error).toBeNull()
    })
  })

  describe('supply position sync', () => {
    it('syncs supply position at any state', () => {
      const actor = createTestActor()
      actor.send({ type: 'SYNC_SUPPLY_POSITION', supplyPositionCryptoBaseUnit: '999' })

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('999')
    })

    it('works during signing states', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SYNC_SUPPLY_POSITION', supplyPositionCryptoBaseUnit: '123456' })

      expect(actor.getSnapshot().context.supplyPositionCryptoBaseUnit).toBe('123456')
    })
  })

  describe('tags', () => {
    it('input state does not have executing tag', () => {
      const actor = createTestActor()
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('confirm state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('success state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('error state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'fail' })
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })
  })

  describe('full happy path', () => {
    it('goes through: input -> confirm -> signing -> confirming -> success -> input', () => {
      const actor = createTestActor()

      actor.send(defaultSubmitEvent)
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')

      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xdef', nonce: 3 })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.withdrawAmountCryptoPrecision).toBe('')
      expect(actor.getSnapshot().context.withdrawAmountCryptoBaseUnit).toBe('0')
      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
      expect(actor.getSnapshot().context.txHash).toBeNull()
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })
  })

  describe('full withdrawal', () => {
    it('preserves isFullWithdrawal through flow and resets on DONE', () => {
      const actor = createTestActor()
      actor.send({ ...defaultSubmitEvent, isFullWithdrawal: true })
      expect(actor.getSnapshot().context.isFullWithdrawal).toBe(true)

      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      expect(actor.getSnapshot().context.isFullWithdrawal).toBe(true)

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().context.isFullWithdrawal).toBe(false)
    })
  })

  describe('resetForNewWithdraw', () => {
    it('DONE resets withdraw-specific context but preserves assetId and isNativeWallet', () => {
      const actor = createTestActor()
      actor.send({ type: 'SYNC_SUPPLY_POSITION', supplyPositionCryptoBaseUnit: '500000000' })
      actor.send(defaultSubmitEvent)
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xabc', nonce: 1 })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'WITHDRAW_CONFIRMED' })
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.withdrawAmountCryptoPrecision).toBe('')
      expect(ctx.withdrawAmountCryptoBaseUnit).toBe('0')
      expect(ctx.lastUsedNonce).toBeUndefined()
      expect(ctx.txHash).toBeNull()
      expect(ctx.error).toBeNull()
      expect(ctx.errorStep).toBeNull()
      expect(ctx.isFullWithdrawal).toBe(false)

      expect(ctx.assetId).toBe(USDC_ASSET_ID)
      expect(ctx.isNativeWallet).toBe(false)
      expect(ctx.supplyPositionCryptoBaseUnit).toBe('500000000')
    })
  })
})
