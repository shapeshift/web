import type Lifi from '@lifi/sdk/dist/Lifi'
import type { Route } from '@lifi/sdk/dist/types'
import type { BuildSendTxInput, ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
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

export const getUnsignedTx = async ({
  selectedLifiRoute,
  accountNumber,
  sellAsset,
  wallet,
}: {
  selectedLifiRoute?: Route
  accountNumber: number
  sellAsset: Asset
  wallet: HDWallet
}): Promise<Result<ETHSignTx, SwapErrorRight>> => {
  try {
    const lifi = getLifi()
    const chainId = sellAsset.chainId
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as ChainAdapter<EvmChainId>

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

    return Ok(txToSign)
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
