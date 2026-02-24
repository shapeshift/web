import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type BorrowStep = 'signing' | 'confirming'

type BorrowMachineContext = {
  assetId: AssetId
  isNativeWallet: boolean
  borrowAmountCryptoPrecision: string
  borrowAmountCryptoBaseUnit: string
  collateralTopupAssetId: AssetId | null
  extraCollateral: { assetId: AssetId; amountCryptoBaseUnit: string }[]
  currentLtvBps: number
  projectedLtvBps: number
  stepConfirmed: boolean
  txHash: string | null
  lastUsedNonce: number | undefined
  error: string | null
  errorStep: BorrowStep | null
}

export type BorrowMachineInput = {
  assetId: AssetId
  isNativeWallet: boolean
}

type BorrowMachineEvent =
  | {
      type: 'SUBMIT'
      borrowAmountCryptoPrecision: string
      borrowAmountCryptoBaseUnit: string
      collateralTopupAssetId: AssetId | null
      extraCollateral: { assetId: AssetId; amountCryptoBaseUnit: string }[]
      projectedLtvBps: number
    }
  | { type: 'CONFIRM' }
  | { type: 'BACK' }
  | { type: 'CONFIRM_STEP' }
  | { type: 'SYNC_LTV'; currentLtvBps: number }
  | { type: 'SIGN_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'SIGN_SUCCESS' }
  | { type: 'SIGN_ERROR'; error: string }
  | { type: 'BORROW_CONFIRMED' }
  | { type: 'BORROW_TIMEOUT'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const borrowMachine = setup({
  types: {
    context: {} as BorrowMachineContext,
    events: {} as BorrowMachineEvent,
    input: {} as BorrowMachineInput,
    tags: {} as 'executing',
  },
  actions: {
    assignSubmit: assign({
      borrowAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.borrowAmountCryptoPrecision
      },
      borrowAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.borrowAmountCryptoBaseUnit
      },
      collateralTopupAssetId: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.collateralTopupAssetId
      },
      extraCollateral: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.extraCollateral
      },
      projectedLtvBps: ({ event }) => {
        assertEvent(event, 'SUBMIT')
        return event.projectedLtvBps
      },
    }),
    syncLtv: assign({
      currentLtvBps: ({ event }) => {
        assertEvent(event, 'SYNC_LTV')
        return event.currentLtvBps
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
        assertEvent(event, ['SIGN_ERROR', 'BORROW_TIMEOUT'])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
    confirmStep: assign({ stepConfirmed: true }),
    resetStepConfirmed: assign({ stepConfirmed: false }),
    resetForNewBorrow: assign({
      borrowAmountCryptoPrecision: '',
      borrowAmountCryptoBaseUnit: '0',
      collateralTopupAssetId: null,
      extraCollateral: [],
      projectedLtvBps: 0,
      txHash: null,
      lastUsedNonce: undefined,
      error: null,
      errorStep: null,
    }),
  },
}).createMachine({
  id: 'borrow',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    isNativeWallet: input.isNativeWallet,
    borrowAmountCryptoPrecision: '',
    borrowAmountCryptoBaseUnit: '0',
    collateralTopupAssetId: null,
    extraCollateral: [],
    currentLtvBps: 0,
    projectedLtvBps: 0,
    stepConfirmed: false,
    txHash: null,
    lastUsedNonce: undefined,
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_LTV: { actions: 'syncLtv' },
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
          actions: ['assignError', assign({ errorStep: 'signing' as BorrowStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        BORROW_CONFIRMED: 'success',
        BORROW_TIMEOUT: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as BorrowStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewBorrow' },
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
