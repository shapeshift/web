import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { voluntaryLiquidationMachine } from './voluntaryLiquidationMachine'

const createTestActor = (action: 'initiate' | 'stop' = 'initiate') =>
  createActor(voluntaryLiquidationMachine, {
    input: { action, isNativeWallet: false },
  })

describe('voluntaryLiquidationMachine', () => {
  describe('initial state', () => {
    it('starts in confirm state', () => {
      const actor = createTestActor()
      actor.start()
      expect(actor.getSnapshot().value).toBe('confirm')
      actor.stop()
    })

    it('sets action from input', () => {
      const actor = createTestActor('stop')
      actor.start()
      expect(actor.getSnapshot().context.action).toBe('stop')
      actor.stop()
    })

    it('sets isNativeWallet from input', () => {
      const actor = createActor(voluntaryLiquidationMachine, {
        input: { action: 'initiate', isNativeWallet: true },
      })
      actor.start()
      expect(actor.getSnapshot().context.isNativeWallet).toBe(true)
      actor.stop()
    })
  })

  describe('confirm -> signing', () => {
    it('transitions to signing on CONFIRM', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')
      actor.stop()
    })

    it('transitions to cancelled on BACK', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().status).toBe('done')
      actor.stop()
    })
  })

  describe('signing', () => {
    it('has executing tag', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
      actor.stop()
    })

    it('stores txHash and nonce on SIGN_BROADCASTED', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_BROADCASTED', txHash: '0xabc', nonce: 5 })
      expect(actor.getSnapshot().context.txHash).toBe('0xabc')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(5)
      actor.stop()
    })

    it('transitions to confirming on SIGN_SUCCESS', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')
      actor.stop()
    })

    it('transitions to error on SIGN_ERROR', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'User rejected' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('User rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('signing')
      actor.stop()
    })

    it('handles CONFIRM_STEP for native wallet', () => {
      const actor = createActor(voluntaryLiquidationMachine, {
        input: { action: 'initiate', isNativeWallet: true },
      })
      actor.start()
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
      actor.stop()
    })
  })

  describe('confirming', () => {
    it('has executing tag', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
      actor.stop()
    })

    it('transitions to success on LIQUIDATION_CONFIRMED', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'LIQUIDATION_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
      actor.stop()
    })

    it('transitions to error on LIQUIDATION_TIMEOUT', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'LIQUIDATION_TIMEOUT', error: 'Timed out' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('Timed out')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')
      actor.stop()
    })
  })

  describe('success', () => {
    it('transitions to cancelled (final) on DONE', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'LIQUIDATION_CONFIRMED' })
      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().status).toBe('done')
      actor.stop()
    })
  })

  describe('error recovery', () => {
    it('retries signing from signing error', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'failed' })
      expect(actor.getSnapshot().value).toBe('error')
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('signing')
      expect(actor.getSnapshot().context.error).toBeNull()
      actor.stop()
    })

    it('retries confirming from confirming error', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_SUCCESS' })
      actor.send({ type: 'LIQUIDATION_TIMEOUT', error: 'timeout' })
      expect(actor.getSnapshot().value).toBe('error')
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('confirming')
      expect(actor.getSnapshot().context.error).toBeNull()
      actor.stop()
    })

    it('goes to cancelled on BACK from error', () => {
      const actor = createTestActor()
      actor.start()
      actor.send({ type: 'CONFIRM' })
      actor.send({ type: 'SIGN_ERROR', error: 'failed' })
      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().status).toBe('done')
      actor.stop()
    })
  })

  describe('stop action', () => {
    it('works identically for stop action', () => {
      const actor = createTestActor('stop')
      actor.start()
      expect(actor.getSnapshot().context.action).toBe('stop')
      actor.send({ type: 'CONFIRM' })
      expect(actor.getSnapshot().value).toBe('signing')
      actor.send({ type: 'SIGN_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')
      actor.send({ type: 'LIQUIDATION_CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')
      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().status).toBe('done')
      actor.stop()
    })
  })
})
