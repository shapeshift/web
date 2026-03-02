import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type EgressStep = 'signing' | 'confirming'

type EgressMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  egressAmountCryptoPrecision: string
  egressAmountCryptoBaseUnit: string
  destinationAddress: string
  freeBalanceCryptoBaseUnit: string
  initialFreeBalanceCryptoBaseUnit: string
  stepConfirmed: boolean
  txHash: string | null
  egressTxRef: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: EgressStep | null
}

export type EgressMachineInput = {
  assetId: AssetId
  isNativeWallet: boolean
}

type EgressMachineEvent =
  | {
      type: 'SUBMIT'
      egressAmountCryptoPrecision: string
      egressAmountCryptoBaseUnit: string
      destinationAddress: string
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_FREE_BALANCE'; freeBalanceCryptoBaseUnit: string }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'EGRESS_CONFIRMED'; egressTxRef?: string }
  | { type: 'EGRESS_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const egressMachine = setup({
  types: {
    context: {} as EgressMachineContext,
    events: {} as EgressMachineEvent,
    input: {} as EgressMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      egressAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.egressAmountCryptoPrecision
      },
      egressAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.egressAmountCryptoBaseUnit
      },
      destinationAddress: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.destinationAddress
      },
    }),
    captureInitialFreeBalance: assign({
      initialFreeBalanceCryptoBaseUnit: ({ context }) => context.freeBalanceCryptoBaseUnit,
    }),
    syncFreeBalance: assign({
      freeBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_FREE_BALANCE')
        return event.freeBalanceCryptoBaseUnit
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
        assertEvent(event, ['SIGN_ERROR', 'EGRESS_TIMEOUT'])
        return event.error
      },
    }),
    assignEgressTxRef: assign({
      egressTxRef: ({ event }) => {
        assertEvent(event, 'EGRESS_CONFIRMED')
        return event.egressTxRef ?? null
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewEgress: assign({
      egressAmountCryptoPrecision: '',
      egressAmountCryptoBaseUnit: '0',
      destinationAddress: '',
      txHash: null,
      egressTxRef: null,
      lastUsedNonce: undefined,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'egress',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    isNativeWallet: input.isNativeWallet,
    egressAmountCryptoPrecision: '',
    egressAmountCryptoBaseUnit: '0',
    destinationAddress: '',
    freeBalanceCryptoBaseUnit: '0',
    initialFreeBalanceCryptoBaseUnit: '0',
    stepConfirmed: false,
    txHash: null,
    egressTxRef: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_FREE_BALANCE: { actions: 'syncFreeBalance' },
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
        CONFIRM: { target: 'signing', actions: 'captureInitialFreeBalance' },
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
          actions: ['assignError', assign({ errorStep: 'signing' as EgressStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        EGRESS_CONFIRMED: { target: 'success', actions: 'assignEgressTxRef' },
        EGRESS_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as EgressStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewEgress' },
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
