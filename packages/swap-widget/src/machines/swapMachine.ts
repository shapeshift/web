import { assign, setup } from 'xstate'

import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import type { Asset, QuoteResponse, TradeRate } from '../types'
import {
  formatAmountForInput,
  getChainType,
  isWidgetExecutableEvmChainId,
  isWidgetExecutableSolanaChainId,
  isWidgetExecutableUtxoChainId,
  parseAmount,
} from '../types'
import * as guardFns from './guards'
import type { SwapMachineContext, SwapMachineEvent } from './types'

export const createInitialContext = (input?: {
  sellAsset?: Asset
  buyAsset?: Asset
  slippage?: string
  buyAmount?: string
  buyAmountBaseUnit?: string
}): SwapMachineContext => {
  const sellAsset = input?.sellAsset ?? DEFAULT_SELL_ASSET
  const buyAsset = input?.buyAsset ?? DEFAULT_BUY_ASSET
  const sellChainType = getChainType(sellAsset.chainId)
  const buyChainType = getChainType(buyAsset.chainId)

  return {
    sellAsset,
    buyAsset,
    sellAmount: '',
    sellAmountBaseUnit: undefined,
    buyAmount: input?.buyAmount ?? '',
    buyAmountBaseUnit: input?.buyAmountBaseUnit,
    isSellAmountFiat: false,
    sellAmountFiat: '',
    selectedRate: null,
    quote: null,
    txHash: null,
    approvalTxHash: null,
    error: null,
    errorSource: null,
    retryCount: 0,
    chainType: sellChainType,
    isDepositFlow: false,
    slippage: input?.slippage ?? '0.5',
    sendAddress: undefined,
    receiveAddress: undefined,
    isSellAssetEvm: isWidgetExecutableEvmChainId(sellAsset.chainId),
    isSellAssetUtxo: isWidgetExecutableUtxoChainId(sellAsset.chainId),
    isSellAssetSolana: isWidgetExecutableSolanaChainId(sellAsset.chainId),
    isBuyAssetEvm: buyChainType === 'evm',
  }
}

export const swapMachine = setup({
  types: {
    context: {} as SwapMachineContext,
    events: {} as SwapMachineEvent,
  },
  guards: {
    hasValidInput: ({ context }) => guardFns.hasValidInput(context),
    isApprovalRequired: ({ context, event }) => {
      const quote = (event as { type: 'QUOTE_SUCCESS'; quote: QuoteResponse }).quote
      if (quote?.approval?.isRequired !== true || context.chainType !== 'evm') return false
      const namespace = context.sellAsset.assetId.split('/')[1]?.split(':')[0]
      return namespace === 'erc20'
    },
    isDepositQuote: ({ context, event }) => {
      const { quote } = event as { type: 'QUOTE_SUCCESS'; quote: QuoteResponse }
      return context.isDepositFlow && !!quote?.depositAddress
    },
    isDepositFlowWithoutAddress: ({ context, event }) => {
      const { quote } = event as { type: 'QUOTE_SUCCESS'; quote: QuoteResponse }
      return context.isDepositFlow && !quote?.depositAddress
    },
    isRestoredDepositFunded: ({ event }) =>
      !!(event as Extract<SwapMachineEvent, { type: 'RESTORE_DEPOSIT' }>).txHash,
    canRetry: ({ context }) => guardFns.canRetry(context),
    isQuoteError: ({ context }) => context.errorSource === 'QUOTE_ERROR',
    isApprovalError: ({ context }) => context.errorSource === 'APPROVAL_ERROR',
    isStatusFailed: ({ context }) => context.errorSource === 'STATUS_FAILED',
    hasQuote: ({ context }) => guardFns.hasQuote(context),
    isEvmChain: ({ context }) => guardFns.isEvmChain(context),
    isUtxoChain: ({ context }) => guardFns.isUtxoChain(context),
    isSolanaChain: ({ context }) => guardFns.isSolanaChain(context),
    hasSendAddress: ({ context }) => guardFns.hasSendAddress(context),
    hasReceiveAddress: ({ context }) => guardFns.hasReceiveAddress(context),
  },
  actions: {
    assignSellAsset: assign(({ context, event }) => {
      const { asset } = event as { type: 'SET_SELL_ASSET'; asset: Asset }
      const chainType = getChainType(asset.chainId)
      const cryptoFields = context.isSellAmountFiat
        ? { sellAmount: '', sellAmountBaseUnit: undefined }
        : {
            sellAmount: context.sellAmount,
            sellAmountBaseUnit: context.sellAmount
              ? parseAmount(context.sellAmount, asset.precision)
              : undefined,
          }
      return {
        sellAsset: asset,
        ...cryptoFields,
        chainType,
        isSellAssetEvm: isWidgetExecutableEvmChainId(asset.chainId),
        isSellAssetUtxo: isWidgetExecutableUtxoChainId(asset.chainId),
        isSellAssetSolana: isWidgetExecutableSolanaChainId(asset.chainId),
        selectedRate: null,
        quote: null,
      }
    }),
    assignBuyAsset: assign(({ context, event }) => {
      const { asset } = event as { type: 'SET_BUY_ASSET'; asset: Asset }
      const buyChainType = getChainType(asset.chainId)
      return {
        buyAsset: asset,
        isBuyAssetEvm: buyChainType === 'evm',
        buyAmount: context.buyAmount,
        buyAmountBaseUnit: context.buyAmount
          ? parseAmount(context.buyAmount, asset.precision)
          : undefined,
        selectedRate: null,
        quote: null,
      }
    }),
    assignSellAmount: assign(({ event }) => {
      const { amount, amountBaseUnit, fiatValue } = event as {
        type: 'SET_SELL_AMOUNT'
        amount: string
        amountBaseUnit: string | undefined
        fiatValue: string
      }
      return {
        sellAmount: amount,
        sellAmountBaseUnit: amountBaseUnit,
        sellAmountFiat: fiatValue,
        buyAmount: '',
        buyAmountBaseUnit: undefined,
        selectedRate: null,
        quote: null,
      }
    }),
    assignSellFiatMode: assign(({ event }) => {
      const { isFiat } = event as { type: 'SET_SELL_FIAT_MODE'; isFiat: boolean }
      return { isSellAmountFiat: isFiat }
    }),
    assignSlippage: assign(({ event }) => ({
      slippage: (event as { type: 'SET_SLIPPAGE'; slippage: string }).slippage,
    })),
    assignSelectedRate: assign(({ event }) => ({
      selectedRate: (event as { type: 'SELECT_RATE'; rate: TradeRate }).rate,
    })),
    assignQuote: assign(({ event }) => ({
      quote: (event as { type: 'QUOTE_SUCCESS'; quote: QuoteResponse }).quote,
    })),
    assignQuoteError: assign(({ event }) => ({
      error: (event as { type: 'QUOTE_ERROR'; error: string }).error,
      errorSource: 'QUOTE_ERROR' as const,
    })),
    assignApprovalTxHash: assign(({ event }) => ({
      approvalTxHash: (event as { type: 'APPROVAL_SUCCESS'; txHash: string }).txHash,
    })),
    assignApprovalError: assign(({ event }) => ({
      error: (event as { type: 'APPROVAL_ERROR'; error: string }).error,
      errorSource: 'APPROVAL_ERROR' as const,
    })),
    assignTxHash: assign(({ event }) => ({
      txHash: (event as { type: 'EXECUTE_SUCCESS'; txHash: string }).txHash,
    })),
    assignDepositFlow: assign(({ event }) => ({
      isDepositFlow:
        (event as { type: 'FETCH_QUOTE'; isDepositFlow?: boolean }).isDepositFlow === true,
    })),
    assignDepositTxHash: assign(({ event }) => ({
      txHash: (event as { type: 'DEPOSIT_DETECTED'; txHash: string }).txHash,
    })),
    assignDepositUnavailableError: assign(() => ({
      error: 'This route needs a connected wallet',
      errorSource: 'QUOTE_ERROR' as const,
    })),
    assignRestoredDeposit: assign(({ event }) => {
      const { quote, sendAddress, receiveAddress, sellAmountBaseUnit, buyAmountBaseUnit, txHash } =
        event as Extract<SwapMachineEvent, { type: 'RESTORE_DEPOSIT' }>
      const { sellAsset, buyAsset } = quote
      return {
        quote,
        sendAddress,
        receiveAddress,
        txHash: txHash ?? null,
        isDepositFlow: true,
        sellAsset,
        buyAsset,
        sellAmountBaseUnit,
        sellAmount: sellAmountBaseUnit
          ? formatAmountForInput(sellAmountBaseUnit, sellAsset.precision)
          : '',
        buyAmountBaseUnit,
        buyAmount: buyAmountBaseUnit
          ? formatAmountForInput(buyAmountBaseUnit, buyAsset.precision)
          : '',
        chainType: getChainType(sellAsset.chainId),
        isSellAssetEvm: isWidgetExecutableEvmChainId(sellAsset.chainId),
        isSellAssetUtxo: isWidgetExecutableUtxoChainId(sellAsset.chainId),
        isSellAssetSolana: isWidgetExecutableSolanaChainId(sellAsset.chainId),
        isBuyAssetEvm: getChainType(buyAsset.chainId) === 'evm',
        error: null,
        errorSource: null,
      }
    }),
    assignExecuteError: assign(({ event }) => ({
      error: (event as { type: 'EXECUTE_ERROR'; error: string }).error,
      errorSource: 'EXECUTE_ERROR' as const,
    })),
    assignStatusFailed: assign(({ event }) => ({
      error: (event as { type: 'STATUS_FAILED'; error: string }).error,
      errorSource: 'STATUS_FAILED' as const,
    })),
    assignSendAddress: assign(({ event }) => ({
      sendAddress: (event as { type: 'SET_SEND_ADDRESS'; address: string | undefined }).address,
    })),
    assignReceiveAddress: assign(({ event }) => ({
      receiveAddress: (event as { type: 'SET_RECEIVE_ADDRESS'; address: string | undefined })
        .address,
    })),
    assignBuyAmount: assign(({ event }) => {
      const { amount, amountBaseUnit } = event as {
        type: 'SET_BUY_AMOUNT'
        amount: string
        amountBaseUnit: string | undefined
      }
      return {
        buyAmount: amount,
        buyAmountBaseUnit: amountBaseUnit,
        sellAmount: '',
        sellAmountBaseUnit: undefined,
        sellAmountFiat: '',
        isSellAmountFiat: false,
        selectedRate: null,
        quote: null,
      }
    }),
    assignChainInfo: assign(({ event }) => {
      const e = event as Extract<SwapMachineEvent, { type: 'UPDATE_CHAIN_INFO' }>
      return {
        chainType: e.chainType,
        isSellAssetEvm: e.isSellAssetEvm,
        isSellAssetUtxo: e.isSellAssetUtxo,
        isSellAssetSolana: e.isSellAssetSolana,
        isBuyAssetEvm: e.isBuyAssetEvm,
      }
    }),
    incrementRetryCount: assign(({ context }) => ({
      retryCount: context.retryCount + 1,
      error: null,
      errorSource: null,
    })),
    resetSwapState: assign(({ context }) => ({
      quote: null,
      txHash: null,
      approvalTxHash: null,
      error: null,
      errorSource: null,
      retryCount: 0,
      selectedRate: null,
      isDepositFlow: false,
      sellAsset: context.sellAsset,
      buyAsset: context.buyAsset,
      sellAmount: context.sellAmount,
      sellAmountBaseUnit: context.sellAmountBaseUnit,
      buyAmount: context.buyAmount,
      buyAmountBaseUnit: context.buyAmountBaseUnit,
      slippage: context.slippage,
      sendAddress: context.sendAddress,
      receiveAddress: context.receiveAddress,
    })),
  },
}).createMachine({
  id: 'swap',
  initial: 'idle',
  context: createInitialContext(),
  states: {
    idle: {
      always: { target: 'input' },
    },
    input: {
      on: {
        SET_SELL_ASSET: { actions: 'assignSellAsset' },
        SET_BUY_ASSET: { actions: 'assignBuyAsset' },
        SET_SELL_AMOUNT: { actions: 'assignSellAmount' },
        SET_BUY_AMOUNT: { actions: 'assignBuyAmount' },
        SET_SELL_FIAT_MODE: { actions: 'assignSellFiatMode' },
        SET_SLIPPAGE: { actions: 'assignSlippage' },
        SELECT_RATE: { actions: 'assignSelectedRate' },
        SET_SEND_ADDRESS: { actions: 'assignSendAddress' },
        SET_RECEIVE_ADDRESS: { actions: 'assignReceiveAddress' },
        UPDATE_CHAIN_INFO: { actions: 'assignChainInfo' },
        RESTORE_DEPOSIT: [
          {
            // Already funded before the reload, so rejoin settlement rather than ask again
            target: 'polling_status',
            guard: 'isRestoredDepositFunded',
            actions: 'assignRestoredDeposit',
          },
          { target: 'awaiting_deposit', actions: 'assignRestoredDeposit' },
        ],
        FETCH_QUOTE: {
          target: 'quoting',
          guard: 'hasValidInput',
          actions: 'assignDepositFlow',
        },
      },
    },
    quoting: {
      on: {
        QUOTE_SUCCESS: [
          {
            target: 'awaiting_deposit',
            guard: 'isDepositQuote',
            actions: 'assignQuote',
          },
          {
            target: 'error',
            guard: 'isDepositFlowWithoutAddress',
            actions: 'assignDepositUnavailableError',
          },
          {
            target: 'approval_needed',
            guard: 'isApprovalRequired',
            actions: 'assignQuote',
          },
          {
            target: 'executing',
            actions: 'assignQuote',
          },
        ],
        QUOTE_ERROR: {
          target: 'error',
          actions: 'assignQuoteError',
        },
      },
    },
    approval_needed: {
      on: {
        APPROVE: { target: 'approving' },
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
    approving: {
      on: {
        APPROVAL_SUCCESS: {
          target: 'executing',
          actions: 'assignApprovalTxHash',
        },
        APPROVAL_ERROR: {
          target: 'error',
          actions: 'assignApprovalError',
        },
      },
    },
    executing: {
      on: {
        EXECUTE_SUCCESS: {
          target: 'polling_status',
          actions: 'assignTxHash',
        },
        EXECUTE_ERROR: {
          target: 'error',
          actions: 'assignExecuteError',
        },
      },
    },
    awaiting_deposit: {
      on: {
        DEPOSIT_DETECTED: { target: 'polling_status', actions: 'assignDepositTxHash' },
        DEPOSIT_EXPIRED: { target: 'deposit_expired' },
        STATUS_FAILED: { target: 'error', actions: 'assignStatusFailed' },
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
    deposit_expired: {
      on: {
        DEPOSIT_DETECTED: { target: 'polling_status', actions: 'assignDepositTxHash' },
        RETRY: { target: 'quoting', actions: 'incrementRetryCount' },
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
    polling_status: {
      on: {
        STATUS_CONFIRMED: { target: 'complete' },
        STATUS_FAILED: {
          target: 'error',
          actions: 'assignStatusFailed',
        },
      },
    },
    complete: {
      on: {
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
    error: {
      on: {
        RETRY: [
          {
            target: 'quoting',
            guard: { type: 'isQuoteError' },
            actions: 'incrementRetryCount',
          },
          {
            target: 'approving',
            guard: { type: 'isApprovalError' },
            actions: 'incrementRetryCount',
          },
          {
            target: 'quoting',
            guard: { type: 'isStatusFailed' },
            actions: 'incrementRetryCount',
          },
          {
            target: 'executing',
            guard: { type: 'canRetry' },
            actions: 'incrementRetryCount',
          },
        ],
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
  },
})
