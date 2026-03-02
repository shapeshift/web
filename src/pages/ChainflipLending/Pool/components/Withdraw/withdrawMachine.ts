import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type WithdrawStep = 'signing' | 'confirming'

type WithdrawMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  withdrawAmountCryptoPrecision: string
  withdrawAmountCryptoBaseUnit: string
  supplyPositionCryptoBaseUnit: string
  isFullWithdrawal: boolean
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: WithdrawStep | null
}

export type WithdrawMachineInput = {
  assetId: AssetId
  isNativeWallet: boolean
}

type WithdrawMachineEvent =
  | {
      type: 'SUBMIT'
      withdrawAmountCryptoPrecision: string
      withdrawAmountCryptoBaseUnit: string
      isFullWithdrawal: boolean
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_SUPPLY_POSITION'; supplyPositionCryptoBaseUnit: string }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'WITHDRAW_CONFIRMED' }
  | { type: 'WITHDRAW_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const withdrawMachine = setup({
  types: {
    context: {} as WithdrawMachineContext,
    events: {} as WithdrawMachineEvent,
    input: {} as WithdrawMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      withdrawAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.withdrawAmountCryptoPrecision
      },
      withdrawAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.withdrawAmountCryptoBaseUnit
      },
      isFullWithdrawal: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.isFullWithdrawal
      },
    }),
    syncSupplyPosition: assign({
      supplyPositionCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_SUPPLY_POSITION')
        return event.supplyPositionCryptoBaseUnit
      },
    }),
    assignSignTx: assign({
      txHash: ({ event }) => {
        assertEvent(event, 'SIGN_BROADCASTED')
        return event.txHash
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'SIGN_BROADCASTED')
        return event.nonce
      },
    }),
    assignError: assign({
      error: ({ event }) => {
        assertEvent(event, ['SIGN_ERROR', 'WITHDRAW_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewWithdraw: assign({
      withdrawAmountCryptoPrecision: '',
      withdrawAmountCryptoBaseUnit: '0',
      isFullWithdrawal: false,
      lastUsedNonce: undefined,
      txHash: null,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'withdraw',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    isNativeWallet: input.isNativeWallet,
    withdrawAmountCryptoPrecision: '',
    withdrawAmountCryptoBaseUnit: '0',
    supplyPositionCryptoBaseUnit: '0',
    isFullWithdrawal: false,
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_SUPPLY_POSITION: { actions: 'syncSupplyPosition' },
  },
  states: {
    input: {
      on: {
        SUBMIT: {
          target: 'confirm',
          actions: 'assignSubmit',
        },
      },
    },

    confirm: {
      on: {
        CONFIRM: 'signing',
        BACK: 'input',
      },
    },

    signing: {
      tags: ['executing'],
      entry: 'resetStepConfirmed',
      on: {
        CONFIRM_STEP: { actions: 'confirmStep' },
        SIGN_BROADCASTED: { actions: 'assignSignTx' },
        SIGN_SUCCESS: 'confirming',
        SIGN_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'signing' as WithdrawStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        WITHDRAW_CONFIRMED: 'success',
        WITHDRAW_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as WithdrawStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewWithdraw' },
      },
    },

    error: {
      on: {
        RETRY: [
          {
            target: 'signing',
            guard: ({ context }) => context.errorStep === 'signing',
            actions: 'clearError',
          },
          {
            target: 'confirming',
            guard: ({ context }) => context.errorStep === 'confirming',
            actions: 'clearError',
          },
        ],
        BACK: { target: 'input', actions: 'clearError' },
      },
    },
  },
})
