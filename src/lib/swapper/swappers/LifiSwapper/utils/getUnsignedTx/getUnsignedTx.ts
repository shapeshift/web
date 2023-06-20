import type { Step } from '@lifi/sdk/dist/types'
import type {
  BuildSignTxInput,
  ChainAdapter,
  EvmChainId,
  SignTx,
} from '@shapeshiftoss/chain-adapters'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { isEvmChainAdapter } from 'lib/utils'

const createBuildSendTxInput = async (
  from: string,
  accountNumber: number,
  lifiStep: Step,
): Promise<BuildSignTxInput<EvmChainId>> => {
  const lifi = getLifi()

  const transactionRequest: providers.TransactionRequest = await (async () => {
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
    throw Error('incomplete or undefined transaction request')
  }

  return {
    value: value.toString(),
    to,
    from,
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

export const getUnsignedTx = async ({
  lifiStep,
  accountNumber,
  sellAsset,
  from,
}: {
  lifiStep: Step
  accountNumber: number
  sellAsset: Asset
  from: string
}): Promise<SignTx<EvmChainId>> => {
  const chainId = sellAsset.chainId
  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId) as ChainAdapter<EvmChainId>

  if (adapter === undefined) {
    throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
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

  const buildSendTxInput = await createBuildSendTxInput(from, accountNumber, lifiStep)

  const signTx = await adapter.buildSignTx(buildSendTxInput)

  return signTx
}
