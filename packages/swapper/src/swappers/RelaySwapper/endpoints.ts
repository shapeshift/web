import { fromChainId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type { UtxoChainId } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'
import type { InterpolationOptions } from 'node-polyglot'

import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import type {
  CommonTradeQuoteInput,
  EvmTransactionRequest,
  GetTradeRateInput,
  GetUnsignedEvmTransactionArgs,
  GetUnsignedUtxoTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../types'
import {
  checkSafeTransactionStatus,
  isExecutableTradeQuote,
  isExecutableTradeStep,
} from '../../utils'
import { chainIdToRelayChainId } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { getRelayUtxoTransactionFees } from './utils/getRelayUtxoTransactionFees'
import { relayService } from './utils/relayService'
import type { RelayStatus } from './utils/types'

export const relayApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input, deps, chainIdToRelayChainId)

    return tradeQuoteResult
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getTradeRate(input, deps, chainIdToRelayChainId)

    return tradeRateResult
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    chainId,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const currentStep = tradeQuote.steps[stepIndex]
    if (!currentStep?.relayTransactionMetadata) throw Error('Missing relay transaction metadata')

    const { to, value, data } = currentStep.relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(value => value === undefined)

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: data.toString(),
      to,
      value,
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')
    const currentStep = tradeQuote.steps[stepIndex]
    if (!currentStep?.relayTransactionMetadata) throw Error('Invalid step index')

    const { to, value, data, gasLimit: gasLimitFromApi } = currentStep.relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(value => value === undefined)

      throw Error('undefined required values in swap step', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const { gasLimit, ...feeData } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return {
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      ...feeData,
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for total gas used.
      gasLimit: BigNumber.max(gasLimitFromApi ?? '0', gasLimit).toFixed(),
    }
  },
  getUnsignedUtxoTransaction: async ({
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps } = tradeQuote
    const firstStep = steps[0]

    if (!isExecutableTradeStep(firstStep)) throw new Error('Unable to execute step')

    const {
      accountNumber,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      relayTransactionMetadata,
    } = firstStep

    if (!relayTransactionMetadata) throw new Error('Missing relay transaction metadata')

    const { to, opReturnData } = relayTransactionMetadata

    const adapter = assertGetUtxoChainAdapter(firstStep.sellAsset.chainId)

    if (!to) throw new Error('Missing transaction destination')
    if (!opReturnData) throw new Error('Missing opReturnData')

    const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
      to,
      value: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        pubkey: xpub,
        opReturnData,
      },
      sendMax: false,
    }

    const feeData = await adapter.getFeeData(getFeeDataInput)

    return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to,
      accountNumber,
      chainSpecific: {
        accountType,
        opReturnData,
        satoshiPerByte: feeData.fast.chainSpecific.satoshiPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({
    tradeQuote,
    xpub,
    assertGetUtxoChainAdapter,
  }: GetUnsignedUtxoTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const { steps } = tradeQuote

    const firstStep = steps[0]

    if (!isExecutableTradeStep(firstStep)) throw new Error('Unable to execute step')

    if (!firstStep.relayTransactionMetadata?.psbt) throw new Error('Missing psbt')

    const sellAssetChainId = firstStep.sellAsset.chainId

    if (!isUtxoChainId(sellAssetChainId)) throw new Error('Invalid chain id')

    const { to, opReturnData } = firstStep.relayTransactionMetadata

    if (!to) throw new Error('Missing transaction destination')
    if (!opReturnData) throw new Error('Missing opReturnData')

    const fees = await getRelayUtxoTransactionFees({
      xpub,
      assertGetUtxoChainAdapter,
      sellAssetChainId: sellAssetChainId as UtxoChainId,
      to,
      sellAmountIncludingProtocolFeesCryptoBaseUnit:
        firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      opReturnData,
    })

    return fees
  },
  getSolanaTransactionFees,
  getUnsignedSolanaTransaction,
  checkTradeStatus: async ({
    quoteId,
    txHash,
    chainId,
    accountId,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
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

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v2?requestId=${quoteId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'success':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'failed':
        case 'refund':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    // Relay refers to in Txs as "inTxHashes" but to out Txs as simply "txHashes" when they really mean "outTxHashes"
    // One thing to note is that for same-chain Txs, there is no "out Tx" per se since the in Tx *is* the out Tx
    const outTxHashes = statusResponse.txHashes
    const isSameChainSwap = statusResponse.destinationChainId === statusResponse.originChainId
    const buyTxHash = isSameChainSwap ? txHash : outTxHashes?.[0]

    return {
      status,
      buyTxHash,
      message: undefined,
    }
  },
}
