import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type RepayStep = 'signing' | 'confirming'

type RepayMachineContext = {
  assetId: AssetId
  loanId: number
  isNativeWallet: boolean
  repayAmountCryptoPrecision: string
  repayAmountCryptoBaseUnit: string
  freeBalanceCryptoBaseUnit: string
  outstandingDebtCryptoBaseUnit: string
  isFullRepayment: boolean
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: RepayStep | null
}

export type RepayMachineInput = {
  assetId: AssetId
  loanId: number
  isNativeWallet: boolean
}

type RepayMachineEvent =
  | {
      type: 'SUBMIT'
      repayAmountCryptoPrecision: string
      repayAmountCryptoBaseUnit: string
      isFullRepayment: boolean
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_FREE_BALANCE'; freeBalanceCryptoBaseUnit: string }
  | { type: 'SYNC_DEBT'; outstandingDebtCryptoBaseUnit: string }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'REPAY_CONFIRMED' }
  | { type: 'REPAY_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const repayMachine = setup({
  types: {
    context: {} as RepayMachineContext,
    events: {} as RepayMachineEvent,
    input: {} as RepayMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      repayAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.repayAmountCryptoPrecision
      },
      repayAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.repayAmountCryptoBaseUnit
      },
      isFullRepayment: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.isFullRepayment
      },
    }),
    syncFreeBalance: assign({
      freeBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_FREE_BALANCE')
        return event.freeBalanceCryptoBaseUnit
      },
    }),
    syncDebt: assign({
      outstandingDebtCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_DEBT')
        return event.outstandingDebtCryptoBaseUnit
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
        assertEvent(event, ['SIGN_ERROR', 'REPAY_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewRepay: assign({
      repayAmountCryptoPrecision: '',
      repayAmountCryptoBaseUnit: '0',
      isFullRepayment: false,
      txHash: null,
      lastUsedNonce: undefined,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'repay',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    loanId: input.loanId,
    isNativeWallet: input.isNativeWallet,
    repayAmountCryptoPrecision: '',
    repayAmountCryptoBaseUnit: '0',
    freeBalanceCryptoBaseUnit: '0',
    outstandingDebtCryptoBaseUnit: '0',
    isFullRepayment: false,
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_FREE_BALANCE: { actions: 'syncFreeBalance' },
    SYNC_DEBT: { actions: 'syncDebt' },
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
          actions: ['assignError', assign({ errorStep: 'signing' as RepayStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        REPAY_CONFIRMED: 'success',
        REPAY_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as RepayStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewRepay' },
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
