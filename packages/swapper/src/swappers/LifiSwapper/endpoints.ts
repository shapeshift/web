import type { ChainKey, ExtendedTransactionInfo, GetStatusRequest, Route } from '@lifi/sdk'
import { getStepTransaction } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn } from '@shapeshiftoss/utils'
import { Err } from '@sniptt/monads/build'

import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { TradeQuoteError } from '../../types'
import {
  checkSafeTransactionStatus,
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
  makeSwapErrorRight,
} from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { configureLiFi } from './utils/configureLiFi'
import { getLifiChainMap } from './utils/getLifiChainMap'

const tradeQuoteMetadata: Map<string, Route> = new Map()

// cached metadata - would need persistent cache with expiry if moved server-side
let lifiChainMapPromise: Promise<Map<ChainId, ChainKey>> | undefined

export const lifiApi: SwapperApi = {
  getTradeQuote: async (input, deps) => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: TradeQuoteError.SellAmountBelowMinimum,
        }),
      )
    }

    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const lifiChainMap = await lifiChainMapPromise

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      deps,
      lifiChainMap,
    )

    return tradeQuoteResult.map(quote =>
      quote.map(tradeQuote => {
        const selectedLifiRoute = tradeQuote.steps[0]?.lifiSpecific?.lifiRoute

        // TODO: quotes below the minimum aren't valid and should not be processed as such
        // selectedLifiRoute will be missing for quotes below the minimum
        if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

        const id = selectedLifiRoute.id

        // store the lifi quote metadata for transaction building later
        tradeQuoteMetadata.set(id, selectedLifiRoute)

        return tradeQuote
      }),
    )
  },
  getTradeRate: async (input, deps) => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: TradeQuoteError.SellAmountBelowMinimum,
        }),
      )
    }

    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const lifiChainMap = await lifiChainMapPromise

    const tradeRateResult = await getTradeRate(input as GetEvmTradeRateInput, deps, lifiChainMap)

    return tradeRateResult.map(rate =>
      rate.map(tradeRate => {
        const selectedLifiRoute = tradeRate.steps[0]?.lifiSpecific?.lifiRoute

        // TODO: quotes below the minimum aren't valid and should not be processed as such
        // selectedLifiRoute will be missing for quotes below the minimum
        if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

        const id = selectedLifiRoute.id

        // store the lifi rate metadata for transaction building later
        tradeQuoteMetadata.set(id, selectedLifiRoute)

        return tradeRate
      }),
    )
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    configureLiFi()

    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset } = step

    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)
    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const lifiStep = lifiRoute.steps[stepIndex]

    const { transactionRequest } = await getStepTransaction(lifiStep)
    if (!transactionRequest) throw Error('undefined transactionRequest')

    const { to, value, data, gasLimit } = transactionRequest

    // checking values individually to keep type checker happy
    if (to === undefined || value === undefined || data === undefined || gasLimit === undefined) {
      const undefinedRequiredValues = [to, value, data, gasLimit].filter(
        value => value === undefined,
      )

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({
      adapter,
      data: data.toString(),
      to,
      // This looks odd but we need this, else unchained estimate calls will fail with:
      // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
      value: bn(value.toString()).toString(),
      from,
      supportsEIP1559,
    })

    return adapter.buildCustomApiTx({
      accountNumber,
      data: data.toString(),
      from,
      to,
      value: value.toString(),
      ...{ ...feeData, gasLimit: gasLimit.toString() },
    })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    configureLiFi()

    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset } = step

    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)
    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const lifiStep = lifiRoute.steps[stepIndex]

    const { transactionRequest } = await getStepTransaction(lifiStep)
    if (!transactionRequest) throw Error('undefined transactionRequest')

    const { to, value, data, gasLimit } = transactionRequest

    // checking values individually to keep type checker happy
    if (to === undefined || value === undefined || data === undefined || gasLimit === undefined) {
      const undefinedRequiredValues = [to, value, data, gasLimit].filter(
        value => value === undefined,
      )

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(sellAsset.chainId),
      data: data.toString(),
      to,
      // This looks odd but we need this, else unchained estimate calls will fail with:
      // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
      value: bn(value.toString()).toString(),
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  checkTradeStatus: async ({
    txHash,
    stepIndex,
    chainId,
    accountId,
    swap,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const lifiRoute = swap?.metadata.lifiRoute
    if (!lifiRoute) throw Error(`Missing Li.Fi route`)

    // getMixPanel()?.track(MixPanelEvent.SwapperApiRequest, {
    //   swapper: SwapperName.LIFI,
    //   method: 'get',
    //   // Note, this may change if the Li.Fi SDK changes
    //   url: 'https://li.quest/v1/status',
    // })

    const {
      action: { fromChainId, toChainId },
      tool,
    } = lifiRoute.steps[stepIndex]

    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      accountId,
      fetchIsSmartContractAddressQuery,
    })

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    // don't use lifi sdk here because all status responses are cached, negating the usefulness of polling
    // i.e don't do `await getLifi().getStatus(getStatusRequest)`
    const url = new URL('https://li.quest/v1/status')
    const getStatusRequestParams: { [Key in keyof GetStatusRequest]: string } = {
      txHash,
      bridge: tool,
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
    }
    url.search = new URLSearchParams(getStatusRequestParams).toString()
    const response = await fetch(url, { cache: 'no-store' }) // don't cache!

    if (!response.ok) return createDefaultStatusResponse()

    const statusResponse = await response.json()

    const receiving: ExtendedTransactionInfo | undefined = statusResponse.receiving

    const status = (() => {
      switch (statusResponse.status) {
        case 'DONE':
          return TxStatus.Confirmed
        case 'PENDING':
          return TxStatus.Pending
        case 'FAILED':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      // We have an out Tx hash (either same or cross-chain) for this step, so we consider the Tx (effectively, the step) confirmed
      status: receiving?.txHash ? TxStatus.Confirmed : status,
      buyTxHash: receiving?.txHash,
      message: statusResponse.substatusMessage,
    }
  },
}
