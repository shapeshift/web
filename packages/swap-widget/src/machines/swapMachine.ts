import { assign, setup } from 'xstate'

import type { Asset, QuoteResponse, TradeRate } from '../types'
import { getChainTypeFromChainId } from './chainUtils'
import * as guardFns from './guards'
import type { SwapMachineContext, SwapMachineEvent } from './types'

const DEFAULT_SELL_ASSET: Asset = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  networkName: 'Ethereum',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
}

const DEFAULT_BUY_ASSET: Asset = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 'eip155:1',
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
  icon: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
}

export const createInitialContext = (input?: {
  sellAsset?: Asset
  buyAsset?: Asset
  slippage?: string
}): SwapMachineContext => {
  const sellAsset = input?.sellAsset ?? DEFAULT_SELL_ASSET
  const buyAsset = input?.buyAsset ?? DEFAULT_BUY_ASSET
  const sellChainType = getChainTypeFromChainId(sellAsset.chainId)
  const buyChainType = getChainTypeFromChainId(buyAsset.chainId)

  return {
    sellAsset,
    buyAsset,
    sellAmount: '',
    sellAmountBaseUnit: undefined,
    selectedRate: null,
    quote: null,
    txHash: null,
    approvalTxHash: null,
    error: null,
    retryCount: 0,
    chainType: sellChainType,
    slippage: input?.slippage ?? '0.5',
    walletAddress: undefined,
    effectiveReceiveAddress: '',
    isSellAssetEvm: sellChainType === 'evm',
    isSellAssetUtxo: sellChainType === 'utxo',
    isSellAssetSolana: sellChainType === 'solana',
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
    canRetry: ({ context }) => guardFns.canRetry(context),
    hasQuote: ({ context }) => guardFns.hasQuote(context),
    isEvmChain: ({ context }) => guardFns.isEvmChain(context),
    isUtxoChain: ({ context }) => guardFns.isUtxoChain(context),
    isSolanaChain: ({ context }) => guardFns.isSolanaChain(context),
    hasWallet: ({ context }) => guardFns.hasWallet(context),
    hasReceiveAddress: ({ context }) => guardFns.hasReceiveAddress(context),
  },
  actions: {
    assignSellAsset: assign(({ event }) => {
      const { asset } = event as { type: 'SET_SELL_ASSET'; asset: Asset }
      const chainType = getChainTypeFromChainId(asset.chainId)
      return {
        sellAsset: asset,
        chainType,
        isSellAssetEvm: chainType === 'evm',
        isSellAssetUtxo: chainType === 'utxo',
        isSellAssetSolana: chainType === 'solana',
        selectedRate: null,
        quote: null,
      }
    }),
    assignBuyAsset: assign(({ event }) => {
      const { asset } = event as { type: 'SET_BUY_ASSET'; asset: Asset }
      const buyChainType = getChainTypeFromChainId(asset.chainId)
      return {
        buyAsset: asset,
        isBuyAssetEvm: buyChainType === 'evm',
        selectedRate: null,
        quote: null,
      }
    }),
    assignSellAmount: assign(({ event }) => {
      const { amount, amountBaseUnit } = event as {
        type: 'SET_SELL_AMOUNT'
        amount: string
        amountBaseUnit: string | undefined
      }
      return {
        sellAmount: amount,
        sellAmountBaseUnit: amountBaseUnit,
      }
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
    })),
    assignApprovalTxHash: assign(({ event }) => ({
      approvalTxHash: (event as { type: 'APPROVAL_SUCCESS'; txHash: string }).txHash,
    })),
    assignApprovalError: assign(({ event }) => ({
      error: (event as { type: 'APPROVAL_ERROR'; error: string }).error,
    })),
    assignTxHash: assign(({ event }) => ({
      txHash: (event as { type: 'EXECUTE_SUCCESS'; txHash: string }).txHash,
    })),
    assignExecuteError: assign(({ event }) => ({
      error: (event as { type: 'EXECUTE_ERROR'; error: string }).error,
    })),
    assignStatusFailed: assign(({ event }) => ({
      error: (event as { type: 'STATUS_FAILED'; error: string }).error,
    })),
    assignWalletAddress: assign(({ event }) => ({
      walletAddress: (event as { type: 'SET_WALLET_ADDRESS'; address: string | undefined }).address,
    })),
    assignReceiveAddress: assign(({ event }) => ({
      effectiveReceiveAddress: (event as { type: 'SET_RECEIVE_ADDRESS'; address: string }).address,
    })),
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
    })),
    resetSwapState: assign(({ context }) => ({
      quote: null,
      txHash: null,
      approvalTxHash: null,
      error: null,
      retryCount: 0,
      sellAsset: context.sellAsset,
      buyAsset: context.buyAsset,
      sellAmount: context.sellAmount,
      sellAmountBaseUnit: context.sellAmountBaseUnit,
      slippage: context.slippage,
      walletAddress: context.walletAddress,
      effectiveReceiveAddress: context.effectiveReceiveAddress,
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
        SET_SLIPPAGE: { actions: 'assignSlippage' },
        SELECT_RATE: { actions: 'assignSelectedRate' },
        SET_WALLET_ADDRESS: { actions: 'assignWalletAddress' },
        SET_RECEIVE_ADDRESS: { actions: 'assignReceiveAddress' },
        UPDATE_CHAIN_INFO: { actions: 'assignChainInfo' },
        SWAP_TOKENS: {},
        FETCH_QUOTE: {
          target: 'quoting',
          guard: 'hasValidInput',
        },
      },
    },
    quoting: {
      on: {
        QUOTE_SUCCESS: [
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
        RETRY: {
          target: 'executing',
          guard: 'canRetry',
          actions: 'incrementRetryCount',
        },
        RESET: { target: 'input', actions: 'resetSwapState' },
      },
    },
  },
})
