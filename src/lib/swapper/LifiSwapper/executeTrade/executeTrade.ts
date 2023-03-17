import type Lifi from '@lifi/sdk/dist/Lifi'
import type { Route, Step } from '@lifi/sdk/dist/types'
import type { BuildSendTxInput, EvmChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeResult } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Signer } from 'ethers'
import { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { SELECTED_ROUTE_INDEX } from 'lib/swapper/LifiSwapper/utils/constants'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/LifiSwapper/utils/types'

const createBuildSendTxInput = async (
  lifi: Lifi,
  wallet: HDWallet,
  accountNumber: number,
  lifiStep: Step,
): Promise<BuildSendTxInput<EvmChainId>> => {
  const transactionRequest: providers.TransactionRequest = await (async () => {
    const transactionRequest = lifiStep?.transactionRequest

    if (transactionRequest !== undefined) return transactionRequest

    // if transactionRequest is not present, request it
    const { transactionRequest: newTransactionRequest } = await lifi.getStepTransaction(lifiStep)
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
    throw new SwapError('[executeTrade] - incomplete or undefined transaction request', {
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

    if (window.ethereum === undefined) {
      throw new SwapError('[executeTrade] - window.ethereum is undefined', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      })
    }

    // TODO: investigate alternatives if required:
    // - [preferred] somehow get Signer from HDWallet (`wallet` in ExecuteTradeInput)
    // - singleton indexed by chainId similar to `src/lib/web3-provider.ts`.
    //
    // Cannot use `lifi.getRpcProvider(chainId)` because it returns a FallbackProvider which is not
    // instanceof JsonRpcProvider which lacks a signer.
    //
    // At minimum this should be a singleton so the provider can maintain state. If live transaction
    // updates in the UI are required eventually then the JsonRpcProvider must be accessible to the UI
    const web3Provider = new providers.Web3Provider(window.ethereum)
    const signer: Signer = web3Provider.getSigner()

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

    const updateCallback = (_updatedRoute: Route) => {
      // do nothing
      // TODO: add debug logger here?
    }

    // We need to refetch the route because the one in getTradeQuote has a different sell amount due to
    // logic surrounding minimumCryptoHuman.
    // TODO: Determine whether we can delete logic surrounding minimum amounts and instead lean on error
    // handling in the UI so we can re-use the routes response here to avoid another fetch
    const routesResponse = await lifi.getRoutes(routesRequest)
    const route = routesResponse.routes[SELECTED_ROUTE_INDEX]

    const routeExecution = await lifi.executeRoute(signer, route, {
      executeInBackground: true,
      updateCallback,
    })

    const buildSendTxInput = await createBuildSendTxInput(
      lifi,
      wallet,
      accountNumber,
      routeExecution.steps[0],
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
