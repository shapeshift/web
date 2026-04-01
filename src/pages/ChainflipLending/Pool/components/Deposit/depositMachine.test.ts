import type { AssetId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'

import { depositMachine } from './depositMachine'

const USDC_ASSET_ID = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as AssetId

const defaultStartEvent = {
  type: 'START' as const,
  depositAmountCryptoBaseUnit: '1000000',
  refundAddress: '0xrefund',
  flipAllowanceCryptoBaseUnit: '0',
  flipFundingAmountCryptoBaseUnit: '1000000000000000000',
  initialFreeBalanceCryptoBaseUnit: '0',
}

const createTestActor = (overrides?: Partial<{ isNativeWallet: boolean }>) => {
  const actor = createActor(depositMachine, {
    input: {
      assetId: USDC_ASSET_ID,
      isNativeWallet: overrides?.isNativeWallet ?? false,
    },
  })
  actor.start()
  return actor
}

describe('depositMachine', () => {
  describe('initial state', () => {
    it('starts at input with correct default context', () => {
      const actor = createTestActor()
      const snapshot = actor.getSnapshot()

      expect(snapshot.value).toBe('input')
      expect(snapshot.context.assetId).toBe(USDC_ASSET_ID)
      expect(snapshot.context.depositAmountCryptoPrecision).toBe('')
      expect(snapshot.context.depositAmountCryptoBaseUnit).toBe('0')
      expect(snapshot.context.depositAddress).toBe('')
      expect(snapshot.context.refundAddress).toBe('')
      expect(snapshot.context.flipAllowanceCryptoBaseUnit).toBe('0')
      expect(snapshot.context.flipFundingAmountCryptoBaseUnit).toBe('0')
      expect(snapshot.context.isFunded).toBe(false)
      expect(snapshot.context.isLpRegistered).toBe(false)
      expect(snapshot.context.hasRefundAddress).toBe(false)
      expect(snapshot.context.initialFreeBalanceCryptoBaseUnit).toBe('0')
      expect(snapshot.context.lastUsedNonce).toBeUndefined()
      expect(snapshot.context.txHashes).toEqual({})
      expect(snapshot.context.error).toBeNull()
      expect(snapshot.context.errorStep).toBeNull()
      expect(snapshot.context.isNativeWallet).toBe(false)
      expect(snapshot.context.stepConfirmed).toBe(false)
    })

    it('passes isNativeWallet from input', () => {
      const actor = createTestActor({ isNativeWallet: true })
      expect(actor.getSnapshot().context.isNativeWallet).toBe(true)
    })
  })

  describe('input flow', () => {
    it('SET_AMOUNT assigns amount to context', () => {
      const actor = createTestActor()
      actor.send({ type: 'SET_AMOUNT', amount: '100.5' })

      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.depositAmountCryptoPrecision).toBe('100.5')
    })

    it('SET_AMOUNT can be sent multiple times', () => {
      const actor = createTestActor()
      actor.send({ type: 'SET_AMOUNT', amount: '100' })
      actor.send({ type: 'SET_AMOUNT', amount: '200' })

      expect(actor.getSnapshot().context.depositAmountCryptoPrecision).toBe('200')
    })

    it('SUBMIT_INPUT routes to refund_address_input when needsRefundAddress', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })

      expect(actor.getSnapshot().value).toBe('refund_address_input')
    })

    it('SUBMIT_INPUT routes to confirm when refund address already set', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })

      expect(actor.getSnapshot().value).toBe('confirm')
    })
  })

  describe('refund address flow', () => {
    it('SET_REFUND_ADDRESS assigns address to context', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xabc123' })

      expect(actor.getSnapshot().value).toBe('refund_address_input')
      expect(actor.getSnapshot().context.refundAddress).toBe('0xabc123')
    })

    it('SUBMIT_REFUND_ADDRESS transitions to confirm', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xabc123' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })

      expect(actor.getSnapshot().value).toBe('confirm')
    })

    it('BACK returns to input', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().value).toBe('input')
    })
  })

  describe('confirm flow', () => {
    it('START assigns deps and moves to checking_account', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        type: 'START',
        depositAmountCryptoBaseUnit: '5000000',
        refundAddress: '0xmyrefund',
        flipAllowanceCryptoBaseUnit: '999999999999999999999',
        flipFundingAmountCryptoBaseUnit: '1000000000000000000',
        initialFreeBalanceCryptoBaseUnit: '500',
      })

      const ctx = actor.getSnapshot().context
      expect(ctx.depositAmountCryptoBaseUnit).toBe('5000000')
      expect(ctx.refundAddress).toBe('0xmyrefund')
      expect(ctx.flipAllowanceCryptoBaseUnit).toBe('999999999999999999999')
      expect(ctx.flipFundingAmountCryptoBaseUnit).toBe('1000000000000000000')
      expect(ctx.initialFreeBalanceCryptoBaseUnit).toBe('500')
    })

    it('START preserves existing refundAddress when event provides empty string', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xprevious' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send({
        ...defaultStartEvent,
        refundAddress: '',
      })

      expect(actor.getSnapshot().context.refundAddress).toBe('0xprevious')
    })

    it('BACK from confirm returns to input', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      expect(actor.getSnapshot().value).toBe('confirm')
      actor.send({ type: 'BACK' })

      expect(actor.getSnapshot().value).toBe('input')
    })
  })

  describe('checking_account guard routing', () => {
    const goToCheckingAccount = (
      actor: ReturnType<typeof createTestActor>,
      syncState: { isFunded: boolean; isLpRegistered: boolean; hasRefundAddress: boolean },
      startOverrides?: Partial<typeof defaultStartEvent>,
    ) => {
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        ...syncState,
      })
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        ...syncState,
      })
      actor.send({ type: 'SUBMIT_INPUT' })

      if (!syncState.hasRefundAddress) {
        actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
        actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      }

      actor.send({ ...defaultStartEvent, ...startOverrides })
    }

    it('routes to approving_flip when not funded and allowance < funding amount', () => {
      const actor = createTestActor()
      goToCheckingAccount(actor, {
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })

      expect(actor.getSnapshot().value).toBe('approving_flip')
    })

    it('routes to funding_account when not funded but allowance sufficient', () => {
      const actor = createTestActor()
      goToCheckingAccount(
        actor,
        { isFunded: false, isLpRegistered: false, hasRefundAddress: true },
        {
          flipAllowanceCryptoBaseUnit: '2000000000000000000',
          flipFundingAmountCryptoBaseUnit: '1000000000000000000',
        },
      )

      expect(actor.getSnapshot().value).toBe('funding_account')
    })

    it('routes to registering when funded but not registered', () => {
      const actor = createTestActor()
      goToCheckingAccount(actor, {
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })

      expect(actor.getSnapshot().value).toBe('registering')
    })

    it('routes to setting_refund_address when funded and registered but no refund address', () => {
      const actor = createTestActor()
      goToCheckingAccount(actor, {
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: false,
      })

      expect(actor.getSnapshot().value).toBe('setting_refund_address')
    })

    it('routes to opening_channel when all prerequisites are met', () => {
      const actor = createTestActor()
      goToCheckingAccount(actor, {
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })

      expect(actor.getSnapshot().value).toBe('opening_channel')
    })
  })

  describe('full happy path (fresh account)', () => {
    it('goes through all steps: approve -> fund -> register -> refund addr -> channel -> send -> confirm -> success -> done', () => {
      const actor = createTestActor()

      actor.send({ type: 'SET_AMOUNT', amount: '100' })
      actor.send({ type: 'SUBMIT_INPUT' })
      expect(actor.getSnapshot().value).toBe('refund_address_input')

      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xrefund' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send(defaultStartEvent)
      expect(actor.getSnapshot().value).toBe('approving_flip')

      actor.send({ type: 'APPROVAL_BROADCASTED', txHash: '0xapproval' })
      expect(actor.getSnapshot().context.txHashes.approval).toBe('0xapproval')
      actor.send({ type: 'APPROVAL_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('funding_account')

      actor.send({ type: 'FUNDING_BROADCASTED', txHash: '0xfunding' })
      expect(actor.getSnapshot().context.txHashes.funding).toBe('0xfunding')
      actor.send({ type: 'FUNDING_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('registering')
      expect(actor.getSnapshot().context.isFunded).toBe(true)

      actor.send({ type: 'REGISTRATION_BROADCASTED', txHash: '0xreg', nonce: 1 })
      expect(actor.getSnapshot().context.txHashes.registration).toBe('0xreg')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)
      actor.send({ type: 'REGISTRATION_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('setting_refund_address')
      expect(actor.getSnapshot().context.isLpRegistered).toBe(true)

      actor.send({ type: 'REFUND_ADDRESS_BROADCASTED', txHash: '0xrefaddr', nonce: 2 })
      expect(actor.getSnapshot().context.txHashes.refundAddress).toBe('0xrefaddr')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(2)
      actor.send({ type: 'REFUND_ADDRESS_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('opening_channel')
      expect(actor.getSnapshot().context.hasRefundAddress).toBe(true)

      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xchan', nonce: 3 })
      expect(actor.getSnapshot().context.txHashes.channel).toBe('0xchan')
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(3)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdepositaddr' })
      expect(actor.getSnapshot().value).toBe('sending_deposit')
      expect(actor.getSnapshot().context.depositAddress).toBe('0xdepositaddr')

      actor.send({ type: 'SEND_BROADCASTED', txHash: '0xsend' })
      expect(actor.getSnapshot().context.txHashes.deposit).toBe('0xsend')
      actor.send({ type: 'SEND_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'CONFIRMED' })
      expect(actor.getSnapshot().value).toBe('success')

      actor.send({ type: 'DONE' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.depositAmountCryptoPrecision).toBe('')
      expect(actor.getSnapshot().context.depositAmountCryptoBaseUnit).toBe('0')
      expect(actor.getSnapshot().context.depositAddress).toBe('')
      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
      expect(actor.getSnapshot().context.txHashes).toEqual({})
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })
  })

  describe('skip steps based on account state', () => {
    it('funded account skips approval and funding, goes to registering', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('registering')
    })

    it('funded + registered account skips to setting_refund_address', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('setting_refund_address')
    })

    it('fully set up account skips to opening_channel', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('opening_channel')
    })

    it('funding_account success skips registration when already registered', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: true,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '2000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('funding_account')
      actor.send({ type: 'FUNDING_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('setting_refund_address')
    })

    it('funding_account success skips to opening_channel when registered and has refund address', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '2000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('funding_account')
      actor.send({ type: 'FUNDING_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('opening_channel')
    })

    it('registration success skips refund address when already set', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('registering')
      actor.send({ type: 'REGISTRATION_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('opening_channel')
    })
  })

  describe('error and retry', () => {
    const goToApproving = () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)
      expect(actor.getSnapshot().value).toBe('approving_flip')
      return actor
    }

    it('APPROVAL_ERROR transitions to error with correct errorStep', () => {
      const actor = goToApproving()
      actor.send({ type: 'APPROVAL_ERROR', error: 'user rejected' })

      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.error).toBe('user rejected')
      expect(actor.getSnapshot().context.errorStep).toBe('approving_flip')
    })

    it('RETRY from approval error returns to approving_flip', () => {
      const actor = goToApproving()
      actor.send({ type: 'APPROVAL_ERROR', error: 'user rejected' })
      actor.send({ type: 'RETRY' })

      expect(actor.getSnapshot().value).toBe('approving_flip')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })

    it('FUNDING_ERROR transitions to error and retries to funding_account', () => {
      const actor = goToApproving()
      actor.send({ type: 'APPROVAL_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('funding_account')

      actor.send({ type: 'FUNDING_ERROR', error: 'insufficient gas' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('funding_account')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('funding_account')
    })

    it('REGISTRATION_ERROR transitions to error and retries to registering', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      expect(actor.getSnapshot().value).toBe('registering')

      actor.send({ type: 'REGISTRATION_ERROR', error: 'nonce too low' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('registering')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('registering')
    })

    it('REFUND_ADDRESS_ERROR transitions to error and retries to setting_refund_address', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)
      expect(actor.getSnapshot().value).toBe('setting_refund_address')

      actor.send({ type: 'REFUND_ADDRESS_ERROR', error: 'revert' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('setting_refund_address')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('setting_refund_address')
    })

    it('CHANNEL_ERROR transitions to error and retries to opening_channel', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      expect(actor.getSnapshot().value).toBe('opening_channel')

      actor.send({ type: 'CHANNEL_ERROR', error: 'rpc error' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('opening_channel')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('opening_channel')
    })

    it('SEND_ERROR transitions to error and retries to sending_deposit', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })
      expect(actor.getSnapshot().value).toBe('sending_deposit')

      actor.send({ type: 'SEND_ERROR', error: 'tx failed' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('sending_deposit')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('sending_deposit')
    })

    it('CONFIRMATION_ERROR transitions to error and retries to confirming', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })
      actor.send({ type: 'SEND_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('confirming')

      actor.send({ type: 'CONFIRMATION_ERROR', error: 'timeout' })
      expect(actor.getSnapshot().value).toBe('error')
      expect(actor.getSnapshot().context.errorStep).toBe('confirming')

      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('confirming')
    })

    it('BACK from error returns to input and clears error', () => {
      const actor = goToApproving()
      actor.send({ type: 'APPROVAL_ERROR', error: 'rejected' })
      expect(actor.getSnapshot().value).toBe('error')

      actor.send({ type: 'BACK' })
      expect(actor.getSnapshot().value).toBe('input')
      expect(actor.getSnapshot().context.error).toBeNull()
      expect(actor.getSnapshot().context.errorStep).toBeNull()
    })
  })

  describe('CONFIRM_STEP / stepConfirmed / resetStepConfirmed', () => {
    it('entry to executing states resets stepConfirmed to false', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('approving_flip')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP sets stepConfirmed to true in approving_flip', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CONFIRM_STEP' })

      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('stepConfirmed resets when transitioning to next executing state', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)

      actor.send({ type: 'APPROVAL_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('funding_account')
      expect(actor.getSnapshot().context.stepConfirmed).toBe(false)
    })

    it('CONFIRM_STEP works in funding_account', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'APPROVAL_SUCCESS' })

      expect(actor.getSnapshot().value).toBe('funding_account')
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('CONFIRM_STEP works in registering', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('registering')
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('CONFIRM_STEP works in setting_refund_address', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('setting_refund_address')
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('CONFIRM_STEP works in opening_channel', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('opening_channel')
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })

    it('CONFIRM_STEP works in sending_deposit', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })

      expect(actor.getSnapshot().value).toBe('sending_deposit')
      actor.send({ type: 'CONFIRM_STEP' })
      expect(actor.getSnapshot().context.stepConfirmed).toBe(true)
    })
  })

  describe('SYNC_ACCOUNT_STATE', () => {
    it('updates isFunded, isLpRegistered, and hasRefundAddress from any state', () => {
      const actor = createTestActor()

      expect(actor.getSnapshot().context.isFunded).toBe(false)
      expect(actor.getSnapshot().context.isLpRegistered).toBe(false)
      expect(actor.getSnapshot().context.hasRefundAddress).toBe(false)

      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })

      expect(actor.getSnapshot().context.isFunded).toBe(true)
      expect(actor.getSnapshot().context.isLpRegistered).toBe(true)
      expect(actor.getSnapshot().context.hasRefundAddress).toBe(true)
    })

    it('can set values back to false', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: false,
      })

      expect(actor.getSnapshot().context.isFunded).toBe(false)
      expect(actor.getSnapshot().context.isLpRegistered).toBe(false)
      expect(actor.getSnapshot().context.hasRefundAddress).toBe(false)
    })

    it('works during confirm state', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      expect(actor.getSnapshot().value).toBe('confirm')

      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })

      expect(actor.getSnapshot().context.isFunded).toBe(true)
      expect(actor.getSnapshot().context.isLpRegistered).toBe(true)
    })
  })

  describe('nonce tracking', () => {
    it('REGISTRATION_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('registering')
      actor.send({ type: 'REGISTRATION_BROADCASTED', txHash: '0xreg', nonce: 5 })

      expect(actor.getSnapshot().context.lastUsedNonce).toBe(5)
      expect(actor.getSnapshot().context.txHashes.registration).toBe('0xreg')
    })

    it('REFUND_ADDRESS_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('setting_refund_address')
      actor.send({ type: 'REFUND_ADDRESS_BROADCASTED', txHash: '0xref', nonce: 7 })

      expect(actor.getSnapshot().context.lastUsedNonce).toBe(7)
      expect(actor.getSnapshot().context.txHashes.refundAddress).toBe('0xref')
    })

    it('CHANNEL_BROADCASTED updates lastUsedNonce', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('opening_channel')
      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xchan', nonce: 10 })

      expect(actor.getSnapshot().context.lastUsedNonce).toBe(10)
      expect(actor.getSnapshot().context.txHashes.channel).toBe('0xchan')
    })

    it('nonces increment across steps in a full flow', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: false,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('registering')
      actor.send({ type: 'REGISTRATION_BROADCASTED', txHash: '0xreg', nonce: 1 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(1)

      actor.send({ type: 'REGISTRATION_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('setting_refund_address')

      actor.send({ type: 'REFUND_ADDRESS_BROADCASTED', txHash: '0xref', nonce: 2 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(2)

      actor.send({ type: 'REFUND_ADDRESS_SUCCESS' })
      expect(actor.getSnapshot().value).toBe('opening_channel')

      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xchan', nonce: 3 })
      expect(actor.getSnapshot().context.lastUsedNonce).toBe(3)
    })

    it('DONE resets lastUsedNonce to undefined', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xchan', nonce: 42 })
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })
      actor.send({ type: 'SEND_SUCCESS' })
      actor.send({ type: 'CONFIRMED' })
      actor.send({ type: 'DONE' })

      expect(actor.getSnapshot().context.lastUsedNonce).toBeUndefined()
    })
  })

  describe('tx hash tracking', () => {
    it('APPROVAL_BROADCASTED assigns approval tx hash', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      actor.send({ type: 'APPROVAL_BROADCASTED', txHash: '0xapprove123' })
      expect(actor.getSnapshot().context.txHashes.approval).toBe('0xapprove123')
    })

    it('FUNDING_BROADCASTED assigns funding tx hash', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'APPROVAL_SUCCESS' })

      actor.send({ type: 'FUNDING_BROADCASTED', txHash: '0xfund456' })
      expect(actor.getSnapshot().context.txHashes.funding).toBe('0xfund456')
    })

    it('SEND_BROADCASTED assigns deposit tx hash', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })

      actor.send({ type: 'SEND_BROADCASTED', txHash: '0xsend789' })
      expect(actor.getSnapshot().context.txHashes.deposit).toBe('0xsend789')
    })

    it('tx hashes accumulate across steps', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      actor.send({ type: 'APPROVAL_BROADCASTED', txHash: '0xa' })
      actor.send({ type: 'APPROVAL_SUCCESS' })
      actor.send({ type: 'FUNDING_BROADCASTED', txHash: '0xf' })
      actor.send({ type: 'FUNDING_SUCCESS' })
      actor.send({ type: 'REGISTRATION_BROADCASTED', txHash: '0xr', nonce: 1 })
      actor.send({ type: 'REGISTRATION_SUCCESS' })
      actor.send({ type: 'REFUND_ADDRESS_BROADCASTED', txHash: '0xra', nonce: 2 })
      actor.send({ type: 'REFUND_ADDRESS_SUCCESS' })
      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xc', nonce: 3 })
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })
      actor.send({ type: 'SEND_BROADCASTED', txHash: '0xs' })

      const txHashes = actor.getSnapshot().context.txHashes
      expect(txHashes.approval).toBe('0xa')
      expect(txHashes.funding).toBe('0xf')
      expect(txHashes.registration).toBe('0xr')
      expect(txHashes.refundAddress).toBe('0xra')
      expect(txHashes.channel).toBe('0xc')
      expect(txHashes.deposit).toBe('0xs')
    })
  })

  describe('tags', () => {
    it('checking_account has executing tag', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('approving_flip has executing tag', () => {
      const actor = createTestActor()
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({ type: 'SET_REFUND_ADDRESS', address: '0xref' })
      actor.send({ type: 'SUBMIT_REFUND_ADDRESS' })
      actor.send(defaultStartEvent)

      expect(actor.getSnapshot().value).toBe('approving_flip')
      expect(actor.getSnapshot().hasTag('executing')).toBe(true)
    })

    it('input state does not have executing tag', () => {
      const actor = createTestActor()
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })

    it('success state does not have executing tag', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdep' })
      actor.send({ type: 'SEND_SUCCESS' })
      actor.send({ type: 'CONFIRMED' })

      expect(actor.getSnapshot().value).toBe('success')
      expect(actor.getSnapshot().hasTag('executing')).toBe(false)
    })
  })

  describe('needsApproval guard edge cases', () => {
    it('allowance equal to funding amount skips approval', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '1000000000000000000',
        flipFundingAmountCryptoBaseUnit: '1000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('funding_account')
    })

    it('allowance greater than funding amount skips approval', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '9999999999999999999',
        flipFundingAmountCryptoBaseUnit: '1000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('funding_account')
    })

    it('zero allowance requires approval', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: false,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '0',
        flipFundingAmountCryptoBaseUnit: '1000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('approving_flip')
    })

    it('funded account never needs approval regardless of allowance', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: false,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send({
        ...defaultStartEvent,
        flipAllowanceCryptoBaseUnit: '0',
        flipFundingAmountCryptoBaseUnit: '1000000000000000000',
      })

      expect(actor.getSnapshot().value).toBe('registering')
    })
  })

  describe('resetForNewDeposit', () => {
    it('DONE resets deposit-specific context but preserves account state', () => {
      const actor = createTestActor()
      actor.send({
        type: 'SYNC_ACCOUNT_STATE',
        isFunded: true,
        isLpRegistered: true,
        hasRefundAddress: true,
      })
      actor.send({ type: 'SET_AMOUNT', amount: '500' })
      actor.send({ type: 'SUBMIT_INPUT' })
      actor.send(defaultStartEvent)
      actor.send({ type: 'CHANNEL_BROADCASTED', txHash: '0xchan', nonce: 1 })
      actor.send({ type: 'CHANNEL_SUCCESS', depositAddress: '0xdepaddr' })
      actor.send({ type: 'SEND_BROADCASTED', txHash: '0xsend' })
      actor.send({ type: 'SEND_SUCCESS' })
      actor.send({ type: 'CONFIRMED' })
      actor.send({ type: 'DONE' })

      const ctx = actor.getSnapshot().context
      expect(ctx.depositAmountCryptoPrecision).toBe('')
      expect(ctx.depositAmountCryptoBaseUnit).toBe('0')
      expect(ctx.depositAddress).toBe('')
      expect(ctx.lastUsedNonce).toBeUndefined()
      expect(ctx.txHashes).toEqual({})
      expect(ctx.error).toBeNull()
      expect(ctx.errorStep).toBeNull()

      expect(ctx.assetId).toBe(USDC_ASSET_ID)
      expect(ctx.isFunded).toBe(true)
      expect(ctx.isLpRegistered).toBe(true)
      expect(ctx.hasRefundAddress).toBe(true)
      expect(ctx.isNativeWallet).toBe(false)
    })
  })
})
