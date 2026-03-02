import { assertEvent, assign, setup } from 'xstate'

export type VoluntaryLiquidationStep = 'signing' | 'confirming'

type VoluntaryLiquidationMachineContext = {
  action: 'initiate' | 'stop'
  isNativeWallet: boolean
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: VoluntaryLiquidationStep | null
}

export type VoluntaryLiquidationMachineInput = {
  action: 'initiate' | 'stop'
  isNativeWallet: boolean
}

type VoluntaryLiquidationMachineEvent =
  | { type: 'CONFIRM' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'LIQUIDATION_CONFIRMED' }
  | { type: 'LIQUIDATION_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }
  | { type: 'BACK' }

export const voluntaryLiquidationMachine = setup({
  types: {
    context: {} as VoluntaryLiquidationMachineContext,
    events: {} as VoluntaryLiquidationMachineEvent,
    input: {} as VoluntaryLiquidationMachineInput,
    tags: {} as 'executing',
  },
  actions: {
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
        assertEvent(event, ['SIGN_ERROR', 'LIQUIDATION_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
  },
}).createMachine({
  id: 'voluntaryLiquidation',
  initial: 'confirm',
  context: ({ input }) => ({
    action: input.action,
    isNativeWallet: input.isNativeWallet,
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  states: {
    confirm: {
      on: {
        CONFIRM: 'signing',
        BACK: 'cancelled',
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
          actions: ['assignError', assign({ errorStep: 'signing' as VoluntaryLiquidationStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        LIQUIDATION_CONFIRMED: 'success',
        LIQUIDATION_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as VoluntaryLiquidationStep })],
        },
      },
    },

    success: {
      on: {
        DONE: 'cancelled',
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
        BACK: { target: 'cancelled', actions: 'clearError' },
      },
    },

    cancelled: {
      type: 'final',
    },
  },
})
