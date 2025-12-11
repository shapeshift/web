import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  CommonGetUnsignedTransactionArgs,
  CommonTradeExecutionInput,
  CosmosSdkTransactionExecutionInput,
  EvmMessageExecutionInput,
  EvmTransactionExecutionInput,
  RelayerTxDetailsArgs,
  SellTxHashArgs,
  SolanaTransactionExecutionInput,
  StatusArgs,
  SuiTransactionExecutionInput,
  SupportedTradeQuoteStepIndex,
  Swap,
  Swapper,
  SwapperApi,
  TradeExecutionEventMap,
  TronTransactionExecutionInput,
  UtxoTransactionExecutionInput,
} from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  isExecutableTradeQuote,
  swappers,
  SwapStatus,
  TRADE_STATUS_POLL_INTERVAL_MILLISECONDS,
  TradeExecutionEvent,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import { EventEmitter } from 'node:events'

import { assertGetCosmosSdkChainAdapter } from './utils/cosmosSdk'
import { assertGetEvmChainAdapter } from './utils/evm'
import { assertGetSolanaChainAdapter } from './utils/solana'
import { assertGetSuiChainAdapter } from './utils/sui'
import { assertGetTronChainAdapter } from './utils/tron'
import { assertGetUtxoChainAdapter } from './utils/utxo'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { poll } from '@/lib/poll/poll'
import { getOrCreateUser } from '@/lib/user/api'
import { selectCurrentSwap, selectWalletEnabledAccountIds } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { selectFirstHopSellAccountId } from '@/state/slices/tradeInputSlice/selectors'
import { store } from '@/state/store'

export const tradeStatusQueryKey = (swapId: string, sellTxHash: string) => [
  'tradeStatus',
  swapId,
  sellTxHash,
]

export const fetchTradeStatus = async ({
  swapper,
  sellTxHash,
  sellAssetChainId,
  address,
  swap,
  stepIndex,
}: {
  swapper: Swapper & SwapperApi
  sellTxHash: string
  sellAssetChainId: string
  address: string | undefined
  swap: Swap | undefined
  stepIndex: SupportedTradeQuoteStepIndex
  config: ReturnType<typeof getConfig>
}) => {
  const {
    status,
    message,
    buyTxHash,
    relayerTxHash,
    relayerExplorerTxLink,
    actualBuyAmountCryptoBaseUnit,
  } = await swapper.checkTradeStatus({
    txHash: sellTxHash,
    chainId: sellAssetChainId,
    address,
    swap,
    stepIndex,
    config: getConfig(),
    assertGetEvmChainAdapter,
    assertGetUtxoChainAdapter,
    assertGetCosmosSdkChainAdapter,
    assertGetSolanaChainAdapter,
    assertGetTronChainAdapter,
    assertGetSuiChainAdapter,
    fetchIsSmartContractAddressQuery,
  })

  return {
    status,
    message,
    buyTxHash,
    relayerTxHash,
    relayerExplorerTxLink,
    actualBuyAmountCryptoBaseUnit,
  }
}

export class TradeExecution {
  private emitter = new EventEmitter()
  private pollInterval = TRADE_STATUS_POLL_INTERVAL_MILLISECONDS

  on<T extends TradeExecutionEvent>(eventName: T, callback: TradeExecutionEventMap[T]): void {
    this.emitter.on(eventName, callback)
  }

  setPollInterval(ms: number): void {
    this.pollInterval = ms
  }

  private async _execWalletAgnostic(
    {
      swapperName,
      tradeQuote,
      stepIndex,
      slippageTolerancePercentageDecimal,
    }: CommonTradeExecutionInput,
    buildSignBroadcast: (
      swapper: Swapper & SwapperApi,
      args: CommonGetUnsignedTransactionArgs,
    ) => Promise<string>,
  ) {
    try {
      const maybeSwapper = swappers[swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swapperName}'`)

      const swapper = maybeSwapper

      const hop = getHopByIndex(tradeQuote, stepIndex)

      if (!hop) {
        throw new Error(`No hop found for stepIndex ${stepIndex}`)
      }

      const chainId = hop.sellAsset.chainId

      if (!isExecutableTradeQuote(tradeQuote)) {
        throw new Error('Unable to execute trade')
      }
      const sellTxHash = await buildSignBroadcast(swapper, {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config: getConfig(),
      })

      const sellTxHashArgs: SellTxHashArgs = { stepIndex, sellTxHash }
      this.emitter.emit(TradeExecutionEvent.SellTxHash, sellTxHashArgs)

      // TODO(gomes): this is wrong, but isn't.
      // It is a "sufficiently sane" solution to avoid more plumbing and possible regressions
      // All this is used for is to check whether the address is a smart contract, to avoid spewing SAFE API with requests
      // Given the intersection of the inherent bits of sc wallets (only one chain, not deployed on others) and EVM chains (same address on every chain)
      // this means that this is absolutely fine, as in case of multi-hops, the first hop and the last would be the same addy
      const accountId = selectFirstHopSellAccountId(store.getState())

      const swap = selectCurrentSwap(store.getState())

      if (!swap) {
        throw new Error('Swap not found')
      }

      const updatedSwap = {
        ...swap,
        sellTxHash,
        receiveAddress: tradeQuote.receiveAddress,
        status: SwapStatus.Pending,
        metadata: {
          ...swap.metadata,
          chainflipSwapId: tradeQuote.steps[0]?.chainflipSpecific?.chainflipSwapId,
          nearIntentsSpecific: tradeQuote.steps[0]?.nearIntentsSpecific,
          relayTransactionMetadata: tradeQuote.steps[0]?.relayTransactionMetadata,
          cowswapQuoteSpecific: tradeQuote.steps[0]?.cowswapQuoteResponse,
          portalsTransactionMetadata: tradeQuote.steps[0]?.portalsTransactionMetadata,
          zrxTransactionMetadata: tradeQuote.steps[0]?.zrxTransactionMetadata,
          bebopTransactionMetadata: tradeQuote.steps[0]?.bebopTransactionMetadata,
          stepIndex,
        },
      }

      store.dispatch(swapSlice.actions.upsertSwap(updatedSwap))

      const isWebServicesEnabled = getConfig().VITE_FEATURE_NOTIFICATIONS_WEBSERVICES

      if (isWebServicesEnabled) {
        const walletEnabledAccountIds = selectWalletEnabledAccountIds(store.getState())
        const userData = await queryClient.fetchQuery<{ id: string }>({
          queryKey: ['user', walletEnabledAccountIds],
          queryFn: () => getOrCreateUser({ accountIds: walletEnabledAccountIds }),
        })

        if (userData) {
          queryClient.fetchQuery({
            queryKey: ['createSwap', swap.id],
            queryFn: () => {
              return axios.post(`${import.meta.env.VITE_SWAPS_SERVER_URL}/swaps`, {
                swapId: swap.id,
                sellTxHash,
                userId: userData?.id,
                sellAsset: updatedSwap.sellAsset,
                buyAsset: updatedSwap.buyAsset,
                sellAmountCryptoBaseUnit: updatedSwap.sellAmountCryptoBaseUnit,
                expectedBuyAmountCryptoBaseUnit: updatedSwap.expectedBuyAmountCryptoBaseUnit,
                sellAmountCryptoPrecision: updatedSwap.sellAmountCryptoPrecision,
                expectedBuyAmountCryptoPrecision: updatedSwap.expectedBuyAmountCryptoPrecision,
                source: updatedSwap.source,
                swapperName: updatedSwap.swapperName,
                sellAccountId: accountId,
                buyAccountId: accountId,
                receiveAddress: updatedSwap.receiveAddress,
                isStreaming: updatedSwap.isStreaming,
                metadata: updatedSwap.metadata,
              })
            },
            staleTime: 0,
            gcTime: 0,
          })
        }
      }

      const { cancelPolling } = poll({
        fn: async () => {
          const {
            status,
            message,
            buyTxHash,
            relayerTxHash,
            relayerExplorerTxLink,
            actualBuyAmountCryptoBaseUnit,
          } = await queryClient.fetchQuery({
            queryKey: tradeStatusQueryKey(swap.id, updatedSwap.sellTxHash),
            queryFn: () =>
              fetchTradeStatus({
                swapper,
                sellTxHash: updatedSwap.sellTxHash,
                sellAssetChainId: updatedSwap.sellAsset.chainId,
                address: accountId ? fromAccountId(accountId).account : undefined,
                swap: updatedSwap,
                stepIndex,
                config: getConfig(),
              }),
            staleTime: this.pollInterval,
            gcTime: this.pollInterval,
          })

          // Emit RelayerTxHash event when relayerTxHash becomes available
          if (
            relayerTxHash &&
            relayerExplorerTxLink &&
            !updatedSwap.metadata.relayerTxHash &&
            !updatedSwap.metadata.relayerExplorerTxLink
          ) {
            const relayerTxDetailsArgs: RelayerTxDetailsArgs = {
              stepIndex,
              relayerTxHash,
              relayerExplorerTxLink,
            }
            this.emitter.emit(TradeExecutionEvent.RelayerTxHash, relayerTxDetailsArgs)
          }

          const payload: StatusArgs = {
            stepIndex,
            status,
            message,
            buyTxHash,
            relayerTxHash,
            actualBuyAmountCryptoBaseUnit,
          }
          this.emitter.emit(TradeExecutionEvent.Status, payload)

          if (status === TxStatus.Confirmed) this.emitter.emit(TradeExecutionEvent.Success, payload)
          if (status === TxStatus.Failed) this.emitter.emit(TradeExecutionEvent.Fail, payload)

          return status
        },
        validate: status => {
          return status === TxStatus.Confirmed || status === TxStatus.Failed
        },
        interval: this.pollInterval,
        maxAttempts: Infinity,
      })

      return { cancelPolling }
    } catch (e) {
      console.error(e)
      this.emitter.emit(TradeExecutionEvent.Error, e)
    }
  }

  async execEvmTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    supportsEIP1559,
    permit2Signature,
    signAndBroadcastTransaction,
  }: EvmTransactionExecutionInput) {
    const buildSignBroadcast =
      (_supportsEIP1559: boolean) =>
      async (
        swapper: Swapper & SwapperApi,
        {
          tradeQuote,
          chainId,
          stepIndex,
          slippageTolerancePercentageDecimal,
          config,
        }: CommonGetUnsignedTransactionArgs,
      ) => {
        if (!swapper.getUnsignedEvmTransaction) {
          throw Error('missing implementation for getUnsignedEvmTransaction')
        }
        if (!swapper.executeEvmTransaction) {
          throw Error('missing implementation for executeEvmTransaction')
        }

        const unsignedTxResult = await swapper.getUnsignedEvmTransaction({
          tradeQuote,
          chainId,
          stepIndex,
          slippageTolerancePercentageDecimal,
          from,
          supportsEIP1559: _supportsEIP1559,
          config,
          assertGetEvmChainAdapter,
          permit2Signature,
        })

        return await swapper.executeEvmTransaction(unsignedTxResult, {
          signAndBroadcastTransaction,
        })
      }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast(supportsEIP1559),
    )
  }

  async execEvmMessage({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signMessage,
  }: EvmMessageExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedEvmMessage) {
        throw Error('missing implementation for getUnsignedEvmMessage')
      }
      if (!swapper.executeEvmMessage) {
        throw Error('missing implementation for executeEvmMessage')
      }

      const unsignedTxResult = await swapper.getUnsignedEvmMessage({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetEvmChainAdapter,
      })

      return await swapper.executeEvmMessage(unsignedTxResult, { signMessage }, config)
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execUtxoTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    xpub,
    senderAddress,
    accountType,
    signAndBroadcastTransaction,
  }: UtxoTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedUtxoTransaction) {
        throw Error('missing implementation for getUnsignedUtxoTransaction')
      }
      if (!swapper.executeUtxoTransaction) {
        throw Error('missing implementation for executeUtxoTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedUtxoTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        xpub,
        senderAddress,
        accountType,
        config,
        assertGetUtxoChainAdapter,
      })

      return await swapper.executeUtxoTransaction(unsignedTxResult, { signAndBroadcastTransaction })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execCosmosSdkTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: CosmosSdkTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedCosmosSdkTransaction) {
        throw Error('missing implementation for getUnsignedCosmosSdkTransaction')
      }
      if (!swapper.executeCosmosSdkTransaction) {
        throw Error('missing implementation for executeCosmosSdkTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedCosmosSdkTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetCosmosSdkChainAdapter,
      })

      return await swapper.executeCosmosSdkTransaction(unsignedTxResult, {
        signAndBroadcastTransaction,
      })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execSolanaTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: SolanaTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedSolanaTransaction) {
        throw Error('missing implementation for getUnsignedSolanaTransaction')
      }
      if (!swapper.executeSolanaTransaction) {
        throw Error('missing implementation for executeSolanaTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedSolanaTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetSolanaChainAdapter,
      })

      return await swapper.executeSolanaTransaction(unsignedTxResult, {
        signAndBroadcastTransaction,
      })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execTronTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: TronTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedTronTransaction) {
        throw Error('missing implementation for getUnsignedTronTransaction')
      }
      if (!swapper.executeTronTransaction) {
        throw Error('missing implementation for executeTronTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedTronTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetTronChainAdapter,
      })

      return await swapper.executeTronTransaction(unsignedTxResult, {
        signAndBroadcastTransaction,
      })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }

  async execSuiTransaction({
    swapperName,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
    from,
    signAndBroadcastTransaction,
  }: SuiTransactionExecutionInput) {
    const buildSignBroadcast = async (
      swapper: Swapper & SwapperApi,
      {
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        config,
      }: CommonGetUnsignedTransactionArgs,
    ) => {
      if (!swapper.getUnsignedSuiTransaction) {
        throw Error('missing implementation for getUnsignedSuiTransaction')
      }
      if (!swapper.executeSuiTransaction) {
        throw Error('missing implementation for executeSuiTransaction')
      }

      const unsignedTxResult = await swapper.getUnsignedSuiTransaction({
        tradeQuote,
        chainId,
        stepIndex,
        slippageTolerancePercentageDecimal,
        from,
        config,
        assertGetSuiChainAdapter,
      })

      return await swapper.executeSuiTransaction(unsignedTxResult, {
        signAndBroadcastTransaction,
      })
    }

    return await this._execWalletAgnostic(
      {
        swapperName,
        tradeQuote,
        stepIndex,
        slippageTolerancePercentageDecimal,
      },
      buildSignBroadcast,
    )
  }
}
