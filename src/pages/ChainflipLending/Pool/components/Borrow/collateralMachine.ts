import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type CollateralStep = 'signing' | 'confirming'

type CollateralMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  mode: 'add' | 'remove'
  collateralAmountCryptoPrecision: string
  collateralAmountCryptoBaseUnit: string
  freeBalanceCryptoBaseUnit: string
  collateralBalanceCryptoBaseUnit: string
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: CollateralStep | null
}

export type CollateralMachineInput = {
  assetId: AssetId
  isNativeWallet: boolean
  mode: 'add' | 'remove'
}

type CollateralMachineEvent =
  | {
      type: 'SUBMIT'
      collateralAmountCryptoPrecision: string
      collateralAmountCryptoBaseUnit: string
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_FREE_BALANCE'; freeBalanceCryptoBaseUnit: string }
  | { type: 'SYNC_COLLATERAL_BALANCE'; collateralBalanceCryptoBaseUnit: string }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'COLLATERAL_CONFIRMED' }
  | { type: 'COLLATERAL_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const collateralMachine = setup({
  types: {
    context: {} as CollateralMachineContext,
    events: {} as CollateralMachineEvent,
    input: {} as CollateralMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      collateralAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.collateralAmountCryptoPrecision
      },
      collateralAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.collateralAmountCryptoBaseUnit
      },
    }),
    syncFreeBalance: assign({
      freeBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_FREE_BALANCE')
        return event.freeBalanceCryptoBaseUnit
      },
    }),
    syncCollateralBalance: assign({
      collateralBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_COLLATERAL_BALANCE')
        return event.collateralBalanceCryptoBaseUnit
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
        assertEvent(event, ['SIGN_ERROR', 'COLLATERAL_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewCollateral: assign({
      collateralAmountCryptoPrecision: '',
      collateralAmountCryptoBaseUnit: '0',
      txHash: null,
      lastUsedNonce: undefined,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'collateral',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    isNativeWallet: input.isNativeWallet,
    mode: input.mode,
    collateralAmountCryptoPrecision: '',
    collateralAmountCryptoBaseUnit: '0',
    freeBalanceCryptoBaseUnit: '0',
    collateralBalanceCryptoBaseUnit: '0',
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_FREE_BALANCE: { actions: 'syncFreeBalance' },
    SYNC_COLLATERAL_BALANCE: { actions: 'syncCollateralBalance' },
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
          actions: ['assignError', assign({ errorStep: 'signing' as CollateralStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        COLLATERAL_CONFIRMED: 'success',
        COLLATERAL_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as CollateralStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewCollateral' },
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
