import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type SupplyStep = 'signing' | 'confirming'

type SupplyMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  supplyAmountCryptoPrecision: string
  supplyAmountCryptoBaseUnit: string
  freeBalanceCryptoBaseUnit: string
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: SupplyStep | null
  initialLendingPositionCryptoBaseUnit: string
}

export type SupplyMachineInput = {
  assetId: AssetId
  isNativeWallet: boolean
}

type SupplyMachineEvent =
  | { type: 'SUBMIT'; supplyAmountCryptoPrecision: string; supplyAmountCryptoBaseUnit: string }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_FREE_BALANCE'; freeBalanceCryptoBaseUnit: string }
  | { type: 'SYNC_LENDING_POSITION'; initialLendingPositionCryptoBaseUnit: string }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'SUPPLY_CONFIRMED' }
  | { type: 'SUPPLY_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const supplyMachine = setup({
  types: {
    context: {} as SupplyMachineContext,
    events: {} as SupplyMachineEvent,
    input: {} as SupplyMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      supplyAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.supplyAmountCryptoPrecision
      },
      supplyAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.supplyAmountCryptoBaseUnit
      },
    }),
    syncFreeBalance: assign({
      freeBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_FREE_BALANCE')
        return event.freeBalanceCryptoBaseUnit
      },
    }),
    syncLendingPosition: assign({
      initialLendingPositionCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SYNC_LENDING_POSITION')
        return event.initialLendingPositionCryptoBaseUnit
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
        assertEvent(event, ['SIGN_ERROR', 'SUPPLY_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewSupply: assign({
      supplyAmountCryptoPrecision: '',
      supplyAmountCryptoBaseUnit: '0',
      txHash: null,
      lastUsedNonce: undefined,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'supply',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    isNativeWallet: input.isNativeWallet,
    supplyAmountCryptoPrecision: '',
    supplyAmountCryptoBaseUnit: '0',
    freeBalanceCryptoBaseUnit: '0',
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
    initialLendingPositionCryptoBaseUnit: '0',
  }),
  on: {
    SYNC_FREE_BALANCE: { actions: 'syncFreeBalance' },
    SYNC_LENDING_POSITION: { actions: 'syncLendingPosition' },
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
          actions: ['assignError', assign({ errorStep: 'signing' as SupplyStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        SUPPLY_CONFIRMED: 'success',
        SUPPLY_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as SupplyStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewSupply' },
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
