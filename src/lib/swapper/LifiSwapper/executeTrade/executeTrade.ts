import type Lifi from '@lifi/sdk/dist/Lifi'
import type { Route } from '@lifi/sdk/dist/types'
import type { BuildSendTxInput, EvmChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeResult } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { SELECTED_ROUTE_INDEX } from 'lib/swapper/LifiSwapper/utils/constants'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/LifiSwapper/utils/types'

const createBuildSendTxInput = async (
  lifi: Lifi,
  wallet: HDWallet,
  accountNumber: number,
  lifiRoute: Route,
): Promise<BuildSendTxInput<EvmChainId>> => {
  // the 0th step is used because its the first in the route, and this must be signed by the owner
  const startStep = lifiRoute.steps[0]

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
}: LifiExecuteTradeInput): Promise<TradeResult> => {
  try {
    const lifi = getLifi()

    const { accountNumber, sellAsset, routesRequest } = trade

    const chainId = sellAsset.chainId
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId)

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId },
      })
    }

    const evmChainAdapter = adapter as unknown as EvmChainAdapter

    // We need to refetch the route because the one in getTradeQuote has a different sell amount due to
    // logic surrounding minimumCryptoHuman.
    // TODO: Determine whether we can delete logic surrounding minimum amounts and instead lean on error
    // handling in the UI so we can re-use the routes response here to avoid another fetch
    const routesResponse = await lifi.getRoutes(routesRequest)
    const selectedRoute = routesResponse.routes[SELECTED_ROUTE_INDEX]

    const buildSendTxInput = await createBuildSendTxInput(
      lifi,
      wallet,
      accountNumber,
      selectedRoute,
    )

    const { txToSign } = await evmChainAdapter.buildSendTransaction(buildSendTxInput)

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await evmChainAdapter.signTransaction({ txToSign, wallet })

      const txid = await evmChainAdapter.broadcastTransaction(signedTx)

      return { tradeId: txid }
    } else if (wallet.supportsBroadcast() && evmChainAdapter.signAndBroadcastTransaction) {
      const txid = await evmChainAdapter.signAndBroadcastTransaction?.({
        txToSign,
        wallet,
      })

      return { tradeId: txid }
    } else {
      throw new SwapError('[executeTrade]', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[executeTrade]', {
      cause: e,
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
    })
  }
}
