import type Lifi from '@lifi/sdk/dist/Lifi'
import type { GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import type { BuildSendTxInput, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeResult } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/LifiSwapper/utils/types'
import { isEvmChainAdapter } from 'lib/utils'

const createBuildSendTxInput = async (
  lifi: Lifi,
  wallet: HDWallet,
  accountNumber: number,
  selectedLifiRoute: Route,
): Promise<BuildSendTxInput<EvmChainId>> => {
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
    throw new SwapError('[createBuildSendTxInput] - incomplete or undefined transaction request', {
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
      details: { transactionRequest },
    })
  }

  return {
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
  }
}

export const executeTrade = async ({
  trade,
  wallet,
}: LifiExecuteTradeInput): Promise<{
  tradeResult: TradeResult
  getStatusRequest: GetStatusRequest
}> => {
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

    const { txToSign } = await adapter.buildSendTransaction(buildSendTxInput)

    const txHash = await (async () => {
      if (wallet.supportsOfflineSigning()) {
        const signedTx = await adapter.signTransaction({ txToSign, wallet })

        const txid = await adapter.broadcastTransaction(signedTx)

        return txid
      }

      if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
        const txid = await adapter.signAndBroadcastTransaction?.({
          txToSign,
          wallet,
        })

        return txid
      }

      throw new SwapError('[executeTrade] - sign and broadcast failed', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    })()

    const getStatusRequest: GetStatusRequest = {
      txHash,
      bridge: selectedLifiRoute.steps[0].tool,
      fromChain: selectedLifiRoute.fromChainId,
      toChain: selectedLifiRoute.toChainId,
    }

    return { tradeResult: { tradeId: txHash }, getStatusRequest }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[executeTrade]', {
      cause: e,
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
    })
  }
}
