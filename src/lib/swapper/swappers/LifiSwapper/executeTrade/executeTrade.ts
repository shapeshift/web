import type { GetStatusRequest } from '@lifi/sdk/dist/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { buildAndBroadcast, createBuildCustomTxInput, isEvmChainAdapter } from 'lib/utils/evm'

type ExecuteTradeResult = {
  tradeResult: TradeResult
  getStatusRequest: GetStatusRequest
}

export const executeTrade = async ({
  trade,
  wallet,
}: LifiExecuteTradeInput): Promise<Result<ExecuteTradeResult, SwapErrorRight>> => {
  const { accountNumber, sellAsset, selectedLifiRoute } = trade

  if (!selectedLifiRoute) {
    return Err(
      makeSwapErrorRight({
        message: '[executeTrade] - no selected route was provided',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const adapter = getChainAdapterManager().get(sellAsset.chainId)

  if (!isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: '[executeTrade] - unsupported chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const lifi = getLifi()

  // the 0th step is used because its the first in the route, and this must be signed by the owner
  const startStep = selectedLifiRoute.steps[0]

  const transactionRequest = await (async () => {
    try {
      if (startStep?.transactionRequest) return Ok(startStep.transactionRequest)
      getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
        swapper: SwapperName.LIFI,
        method: 'get',
        // Note, this may change if the Li.Fi SDK changes
        url: 'https://li.quest/v1/advanced/stepTransaction',
      })
      return Ok((await lifi.getStepTransaction(startStep)).transactionRequest)
    } catch (err) {
      return Err(
        makeSwapErrorRight({
          message: '[executeTrade] - failed to get transactionRequest',
          cause: err,
          code: SwapErrorType.RESPONSE_ERROR,
        }),
      )
    }
  })()

  if (transactionRequest.isErr()) return Err(transactionRequest.unwrapErr())

  const { value, to, data } = transactionRequest.unwrap() ?? {}

  if (!value || !to || !data) {
    return Err(
      makeSwapErrorRight({
        message: '[executeTrade] - invalid transaction request',
        code: SwapErrorType.VALIDATION_FAILED,
        details: { transactionRequest },
      }),
    )
  }

  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      data: data.toString(),
      to,
      value: bn(value.toString()).toFixed(),
      wallet,
    })

    const txid = await buildAndBroadcast({ adapter, buildCustomTxInput })

    const getStatusRequest: GetStatusRequest = {
      txHash: txid,
      bridge: selectedLifiRoute.steps[0].tool,
      fromChain: selectedLifiRoute.fromChainId,
      toChain: selectedLifiRoute.toChainId,
    }

    return Ok({ tradeResult: { tradeId: txid }, getStatusRequest })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[executeTrade] - failed to build and broadcast transaction',
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
        cause: err,
      }),
    )
  }
}
