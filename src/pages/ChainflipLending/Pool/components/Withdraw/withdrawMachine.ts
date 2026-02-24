import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type WithdrawStep = 'signing_batch' | 'signing_remove' | 'signing_egress' | 'confirming'

export type WithdrawTxHashes = {
  batch?: string
  remove?: string
  egress?: string
}

type WithdrawMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  withdrawAmountCryptoPrecision: string
  withdrawAmountCryptoBaseUnit: string
  supplyPositionCryptoBaseUnit: string
  withdrawAddress: string
  stepConfirmed: boolean
  txHashes: WithdrawTxHashes
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: WithdrawStep | null
  useBatch: boolean
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
      withdrawAddress: string
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_SUPPLY_POSITION'; supplyPositionCryptoBaseUnit: string }
  | { type: 'BATCH_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'BATCH_SUCCESS' }
  | { type: 'BATCH_ERROR'; error: string }
  | { type: 'REMOVE_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'REMOVE_SUCCESS' }
  | { type: 'REMOVE_ERROR'; error: string }
  | { type: 'EGRESS_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'EGRESS_SUCCESS' }
  | { type: 'EGRESS_ERROR'; error: string }
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
  guards: {
    useBatch: ({ context }) => context.useBatch,
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
      withdrawAddress: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.withdrawAddress
      },
    }),
    syncSupplyPosition: assign({
      supplyPositionCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_SUPPLY_POSITION')
        return event.supplyPositionCryptoBaseUnit
      },
    }),
    assignBatchTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'BATCH_BROADCASTED')
        return { ...context.txHashes, batch: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'BATCH_BROADCASTED')
        return event.nonce
      },
    }),
    assignRemoveTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'REMOVE_BROADCASTED')
        return { ...context.txHashes, remove: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'REMOVE_BROADCASTED')
        return event.nonce
      },
    }),
    assignEgressTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'EGRESS_BROADCASTED')
        return { ...context.txHashes, egress: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'EGRESS_BROADCASTED')
        return event.nonce
      },
    }),
    disableBatch: assign({ useBatch: false }),
    assignError: assign({
      error: ({ event }) => {
        assertEvent(event, ['BATCH_ERROR', 'REMOVE_ERROR', 'EGRESS_ERROR', 'WITHDRAW_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewWithdraw: assign({
      withdrawAmountCryptoPrecision: '',
      withdrawAmountCryptoBaseUnit: '0',
      withdrawAddress: '',
      lastUsedNonce: undefined,
      txHashes: {},
      error: null,
      errorStep: null,
      useBatch: true,
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
    withdrawAddress: '',
    stepConfirmed: false,
    txHashes: {},
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
    useBatch: true,
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
        CONFIRM: [{ target: 'signing_batch', guard: 'useBatch' }, { target: 'signing_remove' }],
        BACK: 'input',
      },
    },

    signing_batch: {
      tags: ['executing'],
      entry: 'resetStepConfirmed',
      on: {
        CONFIRM_STEP: { actions: 'confirmStep' },
        BATCH_BROADCASTED: { actions: 'assignBatchTx' },
        BATCH_SUCCESS: { target: 'confirming' },
        BATCH_ERROR: {
          target: 'signing_remove',
          actions: 'disableBatch',
        },
      },
    },

    signing_remove: {
      tags: ['executing'],
      entry: 'resetStepConfirmed',
      on: {
        CONFIRM_STEP: { actions: 'confirmStep' },
        REMOVE_BROADCASTED: { actions: 'assignRemoveTx' },
        REMOVE_SUCCESS: { target: 'signing_egress' },
        REMOVE_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'signing_remove' as WithdrawStep })],
        },
      },
    },

    signing_egress: {
      tags: ['executing'],
      entry: 'resetStepConfirmed',
      on: {
        CONFIRM_STEP: { actions: 'confirmStep' },
        EGRESS_BROADCASTED: { actions: 'assignEgressTx' },
        EGRESS_SUCCESS: { target: 'confirming' },
        EGRESS_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'signing_egress' as WithdrawStep })],
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
            target: 'signing_batch',
            guard: ({ context }) => context.errorStep === 'signing_batch',
            actions: 'clearError',
          },
          {
            target: 'signing_remove',
            guard: ({ context }) => context.errorStep === 'signing_remove',
            actions: 'clearError',
          },
          {
            target: 'signing_egress',
            guard: ({ context }) => context.errorStep === 'signing_egress',
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
