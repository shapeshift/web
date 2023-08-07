import type { LifiStep } from '@lifi/types'
import type {
  BuildSendApiTxInput,
  ChainAdapter,
  EvmChainId,
  SignTx,
} from '@shapeshiftoss/chain-adapters'
import type { providers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { isEvmChainAdapter } from 'lib/utils/evm'

const createBuildSendApiTxInput = async (
  from: string,
  accountNumber: number,
  lifiStep: LifiStep,
): Promise<BuildSendApiTxInput<EvmChainId>> => {
  const lifi = getLifi()

  const transactionRequest: providers.TransactionRequest = await (async () => {
    // getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
    //   swapper: SwapperName.LIFI,
    //   method: 'get',
    //   // Note, this may change if the Li.Fi SDK changes
    //   url: 'https://li.quest/v1/advanced/stepTransaction',
    // })
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
      data: data.toString(),
    },
    accountNumber,
  }
}

export const getUnsignedTx = async ({
  lifiStep,
  accountNumber,
  sellAsset,
  from,
}: {
  lifiStep: LifiStep
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

  const buildSendApiTxInput = await createBuildSendApiTxInput(from, accountNumber, lifiStep)

  return adapter.buildSendApiTransaction(buildSendApiTxInput)
}
