import type Lifi from '@lifi/sdk/dist/Lifi'
import type { GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import type { BuildSendTxInput, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { isEvmChainAdapter } from 'lib/utils'

const createBuildSendTxInput = async (
  lifi: Lifi,
  wallet: HDWallet,
  accountNumber: number,
  selectedLifiRoute: Route,
): Promise<Result<BuildSendTxInput<EvmChainId>, SwapErrorRight>> => {
  // the 0th step is used because its the first in the route, and this must be signed by the owner
  const startStep = selectedLifiRoute.steps[0]

  const transactionRequest: providers.TransactionRequest = await (async () => {
    const transactionRequest = startStep?.transactionRequest

    if (transactionRequest !== undefined) return transactionRequest

    // if transactionRequest is not present, request it
    const { transactionRequest: newTransactionRequest } = await lifi.getStepTransaction(startStep)
    return newTransactionRequest ?? {}
  })()

  const { value, to, gasPrice, gasLimit, data } = transactionRequest

  if (
    transactionRequest === undefined ||
    value === undefined ||
    to === undefined ||
    gasPrice === undefined ||
    gasLimit === undefined ||
    data === undefined
  ) {
    return Err(
      makeSwapErrorRight({
        message: '[createBuildSendTxInput] - incomplete or undefined transaction request',
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
        details: { transactionRequest },
      }),
    )
  }

  return Ok({
    value: value.toString(),
    wallet,
    to,
    chainSpecific: {
      gasPrice: gasPrice.toString(),
      gasLimit: gasLimit.toString(),
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    },
    accountNumber,
    memo: data.toString(),
  })
}

export const executeTrade = async ({
  trade,
  wallet,
}: LifiExecuteTradeInput): Promise<
  Result<
    {
      tradeResult: TradeResult
      getStatusRequest: GetStatusRequest
    },
    SwapErrorRight
  >
> => {
  try {
    const lifi = getLifi()

    const { accountNumber, sellAsset, selectedLifiRoute } = trade

    const chainId = sellAsset.chainId
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId)

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId },
      })
    }

    if (selectedLifiRoute === undefined) {
      throw new SwapError('[executeTrade] - no selected route was provided', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      })
    }

    if (!isEvmChainAdapter(adapter)) {
      throw new SwapError('[executeTrade] - non-EVM chain adapter detected', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
        details: {
          chainAdapterName: adapter.getDisplayName(),
          chainId: adapter.getChainId(),
        },
      })
    }

    const buildSendTxInput = await createBuildSendTxInput(
      lifi,
      wallet,
      accountNumber,
      selectedLifiRoute,
    )

    if (buildSendTxInput.isErr()) return Err(buildSendTxInput.unwrapErr())

    const { txToSign } = await adapter.buildSendTransaction(buildSendTxInput.unwrap())

    const maybeTxHash: Result<string, SwapErrorRight> = await (async () => {
      if (wallet.supportsOfflineSigning()) {
        const signedTx = await adapter.signTransaction({ txToSign, wallet })

        const txid = await adapter.broadcastTransaction(signedTx)

        return Ok(txid)
      }

      if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
        const txid = await adapter.signAndBroadcastTransaction?.({
          txToSign,
          wallet,
        })

        return Ok(txid)
      }

      return Err(
        makeSwapErrorRight({
          message: '[executeTrade] - sign and broadcast failed',
          code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
        }),
      )
    })()

    return maybeTxHash.map(txHash => {
      const getStatusRequest: GetStatusRequest = {
        txHash,
        bridge: selectedLifiRoute.steps[0].tool,
        fromChain: selectedLifiRoute.fromChainId,
        toChain: selectedLifiRoute.toChainId,
      }

      return { tradeResult: { tradeId: txHash }, getStatusRequest }
    })
  } catch (e) {
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[executeTrade]',
        cause: e,
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      }),
    )
  }
}
