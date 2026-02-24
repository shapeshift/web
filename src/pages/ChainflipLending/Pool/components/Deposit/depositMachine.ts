import type { AssetId } from '@shapeshiftoss/caip'
import { assertEvent, assign, setup } from 'xstate'

export type DepositStep =
  | 'approving_flip'
  | 'funding_account'
  | 'registering'
  | 'setting_refund_address'
  | 'opening_channel'
  | 'sending_deposit'
  | 'confirming'

export type DepositTxHashes = {
  approval?: string
  funding?: string
  registration?: string
  refundAddress?: string
  channel?: string
  deposit?: string
}

type DepositMachineContext = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  depositAmountCryptoBaseUnit: string
  depositAddress: string
  refundAddress: string
  flipAllowanceCryptoBaseUnit: string
  flipFundingAmountCryptoBaseUnit: string
  isFunded: boolean
  isLpRegistered: boolean
  hasRefundAddress: boolean
  initialFreeBalanceCryptoBaseUnit: string
  lastUsedNonce: number | undefined
  txHashes: DepositTxHashes
  error: string | null
  errorStep: DepositStep | null
}

export type DepositMachineInput = {
  assetId: AssetId
}

type DepositMachineEvent =
  | { type: 'SET_AMOUNT'; amount: string }
  | { type: 'SUBMIT_INPUT' }
  | { type: 'SET_REFUND_ADDRESS'; address: string }
  | { type: 'SUBMIT_REFUND_ADDRESS' }
  | { type: 'BACK' }
  | {
      type: 'SYNC_ACCOUNT_STATE'
      isFunded: boolean
      isLpRegistered: boolean
      hasRefundAddress: boolean
    }
  | {
      type: 'START'
      depositAmountCryptoBaseUnit: string
      refundAddress: string
      flipAllowanceCryptoBaseUnit: string
      flipFundingAmountCryptoBaseUnit: string
      initialFreeBalanceCryptoBaseUnit: string
    }
  | { type: 'APPROVAL_BROADCASTED'; txHash: string }
  | { type: 'APPROVAL_SUCCESS' }
  | { type: 'APPROVAL_ERROR'; error: string }
  | { type: 'FUNDING_BROADCASTED'; txHash: string }
  | { type: 'FUNDING_SUCCESS' }
  | { type: 'FUNDING_ERROR'; error: string }
  | { type: 'REGISTRATION_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'REGISTRATION_SUCCESS' }
  | { type: 'REGISTRATION_ERROR'; error: string }
  | { type: 'REFUND_ADDRESS_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'REFUND_ADDRESS_SUCCESS' }
  | { type: 'REFUND_ADDRESS_ERROR'; error: string }
  | { type: 'CHANNEL_BROADCASTED'; txHash: string; nonce: number }
  | { type: 'CHANNEL_SUCCESS'; depositAddress: string }
  | { type: 'CHANNEL_ERROR'; error: string }
  | { type: 'SEND_BROADCASTED'; txHash: string }
  | { type: 'SEND_SUCCESS' }
  | { type: 'SEND_ERROR'; error: string }
  | { type: 'CONFIRMED' }
  | { type: 'CONFIRMATION_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'DONE' }

export const depositMachine = setup({
  types: {
    context: {} as DepositMachineContext,
    events: {} as DepositMachineEvent,
    input: {} as DepositMachineInput,
    tags: {} as 'executing',
  },
  guards: {
    needsApproval: ({ context }) =>
      !context.isFunded &&
      BigInt(context.flipAllowanceCryptoBaseUnit || '0') <
        BigInt(context.flipFundingAmountCryptoBaseUnit),
    needsFunding: ({ context }) => !context.isFunded,
    needsRegistration: ({ context }) => !context.isLpRegistered,
    needsRefundAddress: ({ context }) => !context.hasRefundAddress,
  },
  actions: {
    assignAmount: assign({
      depositAmountCryptoPrecision: ({ event }) => {
        assertEvent(event, 'SET_AMOUNT')
        return event.amount
      },
    }),
    assignRefundAddress: assign({
      refundAddress: ({ event }) => {
        assertEvent(event, 'SET_REFUND_ADDRESS')
        return event.address
      },
    }),
    syncAccountState: assign({
      isFunded: ({ event }) => {
        assertEvent(event, 'SYNC_ACCOUNT_STATE')
        return event.isFunded
      },
      isLpRegistered: ({ event }) => {
        assertEvent(event, 'SYNC_ACCOUNT_STATE')
        return event.isLpRegistered
      },
      hasRefundAddress: ({ event }) => {
        assertEvent(event, 'SYNC_ACCOUNT_STATE')
        return event.hasRefundAddress
      },
    }),
    assignStartDeps: assign({
      depositAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'START')
        return event.depositAmountCryptoBaseUnit
      },
      refundAddress: ({ context, event }) => {
        assertEvent(event, 'START')
        return event.refundAddress || context.refundAddress
      },
      flipAllowanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'START')
        return event.flipAllowanceCryptoBaseUnit
      },
      flipFundingAmountCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'START')
        return event.flipFundingAmountCryptoBaseUnit
      },
      initialFreeBalanceCryptoBaseUnit: ({ event }) => {
        assertEvent(event, 'START')
        return event.initialFreeBalanceCryptoBaseUnit
      },
    }),
    resetForNewDeposit: assign({
      depositAmountCryptoPrecision: '',
      depositAmountCryptoBaseUnit: '0',
      depositAddress: '',
      lastUsedNonce: undefined,
      txHashes: {},
      error: null,
      errorStep: null,
    }),
    assignApprovalTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'APPROVAL_BROADCASTED')
        return { ...context.txHashes, approval: event.txHash }
      },
    }),
    assignFundingTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'FUNDING_BROADCASTED')
        return { ...context.txHashes, funding: event.txHash }
      },
    }),
    assignRegistrationTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'REGISTRATION_BROADCASTED')
        return { ...context.txHashes, registration: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'REGISTRATION_BROADCASTED')
        return event.nonce
      },
    }),
    assignRefundAddressTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'REFUND_ADDRESS_BROADCASTED')
        return { ...context.txHashes, refundAddress: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'REFUND_ADDRESS_BROADCASTED')
        return event.nonce
      },
    }),
    assignChannelTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'CHANNEL_BROADCASTED')
        return { ...context.txHashes, channel: event.txHash }
      },
      lastUsedNonce: ({ event }) => {
        assertEvent(event, 'CHANNEL_BROADCASTED')
        return event.nonce
      },
    }),
    assignDepositAddress: assign({
      depositAddress: ({ event }) => {
        assertEvent(event, 'CHANNEL_SUCCESS')
        return event.depositAddress
      },
    }),
    assignSendTx: assign({
      txHashes: ({ context, event }) => {
        assertEvent(event, 'SEND_BROADCASTED')
        return { ...context.txHashes, deposit: event.txHash }
      },
    }),
    markFunded: assign({ isFunded: true }),
    markRegistered: assign({ isLpRegistered: true }),
    markRefundAddressSet: assign({ hasRefundAddress: true }),
    assignError: assign({
      error: ({ event }) => {
        assertEvent(event, [
          'APPROVAL_ERROR',
          'FUNDING_ERROR',
          'REGISTRATION_ERROR',
          'REFUND_ADDRESS_ERROR',
          'CHANNEL_ERROR',
          'SEND_ERROR',
          'CONFIRMATION_ERROR',
        ])
        return event.error
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
  },
}).createMachine({
  id: 'deposit',
  initial: 'input',
  context: ({ input }) => ({
    assetId: input.assetId,
    depositAmountCryptoPrecision: '',
    depositAmountCryptoBaseUnit: '0',
    depositAddress: '',
    refundAddress: '',
    flipAllowanceCryptoBaseUnit: '0',
    flipFundingAmountCryptoBaseUnit: '0',
    isFunded: false,
    isLpRegistered: false,
    hasRefundAddress: false,
    initialFreeBalanceCryptoBaseUnit: '0',
    lastUsedNonce: undefined,
    txHashes: {},
    error: null,
    errorStep: null,
  }),
  on: {
    SYNC_ACCOUNT_STATE: { actions: 'syncAccountState' },
  },
  states: {
    input: {
      on: {
        SET_AMOUNT: { actions: 'assignAmount' },
        SUBMIT_INPUT: [
          { target: 'refund_address_input', guard: 'needsRefundAddress' },
          { target: 'confirm' },
        ],
      },
    },

    refund_address_input: {
      on: {
        SET_REFUND_ADDRESS: { actions: 'assignRefundAddress' },
        SUBMIT_REFUND_ADDRESS: 'confirm',
        BACK: 'input',
      },
    },

    confirm: {
      on: {
        START: {
          target: 'checking_account',
          actions: 'assignStartDeps',
        },
        BACK: 'input',
      },
    },

    checking_account: {
      tags: ['executing'],
      always: [
        { target: 'approving_flip', guard: 'needsApproval' },
        { target: 'funding_account', guard: 'needsFunding' },
        { target: 'registering', guard: 'needsRegistration' },
        { target: 'setting_refund_address', guard: 'needsRefundAddress' },
        { target: 'opening_channel' },
      ],
    },

    approving_flip: {
      tags: ['executing'],
      on: {
        APPROVAL_BROADCASTED: { actions: 'assignApprovalTx' },
        APPROVAL_SUCCESS: { target: 'funding_account' },
        APPROVAL_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'approving_flip' as DepositStep })],
        },
      },
    },

    funding_account: {
      tags: ['executing'],
      on: {
        FUNDING_BROADCASTED: { actions: 'assignFundingTx' },
        FUNDING_SUCCESS: [
          {
            target: 'registering',
            guard: 'needsRegistration',
            actions: 'markFunded',
          },
          {
            target: 'setting_refund_address',
            guard: 'needsRefundAddress',
            actions: 'markFunded',
          },
          {
            target: 'opening_channel',
            actions: 'markFunded',
          },
        ],
        FUNDING_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'funding_account' as DepositStep })],
        },
      },
    },

    registering: {
      tags: ['executing'],
      on: {
        REGISTRATION_BROADCASTED: { actions: 'assignRegistrationTx' },
        REGISTRATION_SUCCESS: [
          {
            target: 'setting_refund_address',
            guard: 'needsRefundAddress',
            actions: 'markRegistered',
          },
          {
            target: 'opening_channel',
            actions: 'markRegistered',
          },
        ],
        REGISTRATION_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'registering' as DepositStep })],
        },
      },
    },

    setting_refund_address: {
      tags: ['executing'],
      on: {
        REFUND_ADDRESS_BROADCASTED: { actions: 'assignRefundAddressTx' },
        REFUND_ADDRESS_SUCCESS: {
          target: 'opening_channel',
          actions: 'markRefundAddressSet',
        },
        REFUND_ADDRESS_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'setting_refund_address' as DepositStep })],
        },
      },
    },

    opening_channel: {
      tags: ['executing'],
      on: {
        CHANNEL_BROADCASTED: { actions: 'assignChannelTx' },
        CHANNEL_SUCCESS: {
          target: 'sending_deposit',
          actions: 'assignDepositAddress',
        },
        CHANNEL_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'opening_channel' as DepositStep })],
        },
      },
    },

    sending_deposit: {
      tags: ['executing'],
      on: {
        SEND_BROADCASTED: { actions: 'assignSendTx' },
        SEND_SUCCESS: { target: 'confirming' },
        SEND_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'sending_deposit' as DepositStep })],
        },
      },
    },

    confirming: {
      tags: ['executing'],
      on: {
        CONFIRMED: 'success',
        CONFIRMATION_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as DepositStep })],
        },
      },
    },

    success: {
      on: {
        DONE: { target: 'input', actions: 'resetForNewDeposit' },
      },
    },

    error: {
      on: {
        RETRY: [
          {
            target: 'approving_flip',
            guard: ({ context }) => context.errorStep === 'approving_flip',
            actions: 'clearError',
          },
          {
            target: 'funding_account',
            guard: ({ context }) => context.errorStep === 'funding_account',
            actions: 'clearError',
          },
          {
            target: 'registering',
            guard: ({ context }) => context.errorStep === 'registering',
            actions: 'clearError',
          },
          {
            target: 'setting_refund_address',
            guard: ({ context }) => context.errorStep === 'setting_refund_address',
            actions: 'clearError',
          },
          {
            target: 'opening_channel',
            guard: ({ context }) => context.errorStep === 'opening_channel',
            actions: 'clearError',
          },
          {
            target: 'sending_deposit',
            guard: ({ context }) => context.errorStep === 'sending_deposit',
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
