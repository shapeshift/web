import type { AssetId } from '@shapeshiftoss/caip'
import { assign, setup } from 'xstate'

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
  txHashes: DepositTxHashes
  error: string | null
  errorStep: DepositStep | null
}

export type DepositMachineInput = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  depositAmountCryptoBaseUnit: string
  refundAddress: string
  flipAllowanceCryptoBaseUnit: string
  flipFundingAmountCryptoBaseUnit: string
  isFunded: boolean
  isLpRegistered: boolean
  hasRefundAddress: boolean
  initialFreeBalanceCryptoBaseUnit: string
}

type DepositMachineEvent =
  | { type: 'START' }
  | { type: 'APPROVAL_BROADCASTED'; txHash: string }
  | { type: 'APPROVAL_SUCCESS' }
  | { type: 'APPROVAL_ERROR'; error: string }
  | { type: 'FUNDING_BROADCASTED'; txHash: string }
  | { type: 'FUNDING_SUCCESS' }
  | { type: 'FUNDING_ERROR'; error: string }
  | { type: 'REGISTRATION_BROADCASTED'; txHash: string }
  | { type: 'REGISTRATION_SUCCESS' }
  | { type: 'REGISTRATION_ERROR'; error: string }
  | { type: 'REFUND_ADDRESS_BROADCASTED'; txHash: string }
  | { type: 'REFUND_ADDRESS_SUCCESS' }
  | { type: 'REFUND_ADDRESS_ERROR'; error: string }
  | { type: 'CHANNEL_BROADCASTED'; txHash: string }
  | { type: 'CHANNEL_SUCCESS'; depositAddress: string }
  | { type: 'CHANNEL_ERROR'; error: string }
  | { type: 'SEND_BROADCASTED'; txHash: string }
  | { type: 'SEND_SUCCESS' }
  | { type: 'SEND_ERROR'; error: string }
  | { type: 'CONFIRMED' }
  | { type: 'CONFIRMATION_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' }

export const depositMachine = setup({
  types: {
    context: {} as DepositMachineContext,
    events: {} as DepositMachineEvent,
    input: {} as DepositMachineInput,
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
    assignApprovalTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        approval: (event as { txHash: string }).txHash,
      }),
    }),
    assignFundingTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        funding: (event as { txHash: string }).txHash,
      }),
    }),
    assignRegistrationTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        registration: (event as { txHash: string }).txHash,
      }),
    }),
    assignRefundAddressTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        refundAddress: (event as { txHash: string }).txHash,
      }),
    }),
    assignChannelTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        channel: (event as { txHash: string }).txHash,
      }),
    }),
    assignDepositAddress: assign({
      depositAddress: ({ event }) =>
        (event as { type: 'CHANNEL_SUCCESS'; depositAddress: string }).depositAddress,
    }),
    assignSendTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        deposit: (event as { txHash: string }).txHash,
      }),
    }),
    markFunded: assign({ isFunded: true }),
    markRegistered: assign({ isLpRegistered: true }),
    markRefundAddressSet: assign({ hasRefundAddress: true }),
    assignError: assign({
      error: ({ event }) => {
        if ('error' in event) return (event as { error: string }).error
        return 'Unknown error'
      },
    }),
    clearError: assign({ error: null, errorStep: null }),
  },
}).createMachine({
  id: 'deposit',
  initial: 'idle',
  context: ({ input }) => ({
    assetId: input.assetId,
    depositAmountCryptoPrecision: input.depositAmountCryptoPrecision,
    depositAmountCryptoBaseUnit: input.depositAmountCryptoBaseUnit,
    depositAddress: '',
    refundAddress: input.refundAddress,
    flipAllowanceCryptoBaseUnit: input.flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit: input.flipFundingAmountCryptoBaseUnit,
    isFunded: input.isFunded,
    isLpRegistered: input.isLpRegistered,
    hasRefundAddress: input.hasRefundAddress,
    initialFreeBalanceCryptoBaseUnit: input.initialFreeBalanceCryptoBaseUnit,
    txHashes: {},
    error: null,
    errorStep: null,
  }),
  states: {
    idle: {
      on: { START: 'checking_account' },
    },

    checking_account: {
      always: [
        { target: 'approving_flip', guard: 'needsApproval' },
        { target: 'funding_account', guard: 'needsFunding' },
        { target: 'registering', guard: 'needsRegistration' },
        { target: 'setting_refund_address', guard: 'needsRefundAddress' },
        { target: 'opening_channel' },
      ],
    },

    approving_flip: {
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
      on: {
        CONFIRMED: 'success',
        CONFIRMATION_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'confirming' as DepositStep })],
        },
      },
    },

    success: {
      type: 'final',
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
        RESET: 'idle',
      },
    },
  },
})
