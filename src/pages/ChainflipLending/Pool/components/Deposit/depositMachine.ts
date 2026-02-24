import type { AssetId } from '@shapeshiftoss/caip'
import { assign, setup } from 'xstate'

export type DepositStep =
  | 'approving_flip'
  | 'funding_account'
  | 'registering'
  | 'opening_channel'
  | 'sending_deposit'
  | 'confirming'

type DepositTxHashes = {
  approval?: string
  funding?: string
  registration?: string
  channel?: string
  deposit?: string
}

type DepositMachineContext = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  depositAmountCryptoBaseUnit: string
  depositAddress: string
  flipAllowanceCryptoBaseUnit: string
  flipFundingAmountCryptoBaseUnit: string
  isFunded: boolean
  isLpRegistered: boolean
  initialFreeBalanceCryptoBaseUnit: string
  txHashes: DepositTxHashes
  error: string | null
  errorStep: DepositStep | null
}

export type DepositMachineInput = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  depositAmountCryptoBaseUnit: string
  flipAllowanceCryptoBaseUnit: string
  flipFundingAmountCryptoBaseUnit: string
  isFunded: boolean
  isLpRegistered: boolean
  initialFreeBalanceCryptoBaseUnit: string
}

type DepositMachineEvent =
  | { type: 'START' }
  | { type: 'APPROVAL_SUCCESS'; txHash: string }
  | { type: 'APPROVAL_ERROR'; error: string }
  | { type: 'FUNDING_SUCCESS'; txHash: string }
  | { type: 'FUNDING_ERROR'; error: string }
  | { type: 'REGISTRATION_SUCCESS'; txHash: string }
  | { type: 'REGISTRATION_ERROR'; error: string }
  | { type: 'CHANNEL_SUCCESS'; depositAddress: string; txHash: string }
  | { type: 'CHANNEL_ERROR'; error: string }
  | { type: 'SEND_SUCCESS'; txHash: string }
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
  },
  actions: {
    assignApprovalTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        approval: (event as { type: 'APPROVAL_SUCCESS'; txHash: string }).txHash,
      }),
    }),
    assignFundingTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        funding: (event as { type: 'FUNDING_SUCCESS'; txHash: string }).txHash,
      }),
      isFunded: true,
    }),
    assignRegistrationTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        registration: (event as { type: 'REGISTRATION_SUCCESS'; txHash: string }).txHash,
      }),
      isLpRegistered: true,
    }),
    assignChannelData: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        channel: (event as { type: 'CHANNEL_SUCCESS'; txHash: string }).txHash,
      }),
      depositAddress: ({ event }) =>
        (event as { type: 'CHANNEL_SUCCESS'; depositAddress: string }).depositAddress,
    }),
    assignSendTx: assign({
      txHashes: ({ context, event }) => ({
        ...context.txHashes,
        deposit: (event as { type: 'SEND_SUCCESS'; txHash: string }).txHash,
      }),
    }),
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
    flipAllowanceCryptoBaseUnit: input.flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit: input.flipFundingAmountCryptoBaseUnit,
    isFunded: input.isFunded,
    isLpRegistered: input.isLpRegistered,
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
        { target: 'opening_channel' },
      ],
    },

    approving_flip: {
      on: {
        APPROVAL_SUCCESS: {
          target: 'funding_account',
          actions: 'assignApprovalTx',
        },
        APPROVAL_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'approving_flip' as DepositStep })],
        },
      },
    },

    funding_account: {
      on: {
        FUNDING_SUCCESS: [
          {
            target: 'registering',
            guard: 'needsRegistration',
            actions: 'assignFundingTx',
          },
          {
            target: 'opening_channel',
            actions: 'assignFundingTx',
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
        REGISTRATION_SUCCESS: {
          target: 'opening_channel',
          actions: 'assignRegistrationTx',
        },
        REGISTRATION_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'registering' as DepositStep })],
        },
      },
    },

    opening_channel: {
      on: {
        CHANNEL_SUCCESS: {
          target: 'sending_deposit',
          actions: 'assignChannelData',
        },
        CHANNEL_ERROR: {
          target: 'error',
          actions: ['assignError', assign({ errorStep: 'opening_channel' as DepositStep })],
        },
      },
    },

    sending_deposit: {
      on: {
        SEND_SUCCESS: {
          target: 'confirming',
          actions: 'assignSendTx',
        },
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
