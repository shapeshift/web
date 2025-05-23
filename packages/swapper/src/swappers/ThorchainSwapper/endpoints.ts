import type { StdSignDoc } from '@cosmjs/amino'
import type { StdFee } from '@keplr-wallet/types'
import { cosmosAssetId, fromChainId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import { cosmossdk as cosmossdkChainAdapter, evm } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type { UtxoChainId } from '@shapeshiftoss/types'
import { cosmossdk, TxStatus } from '@shapeshiftoss/unchained-client'
import { assertUnreachable, BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import assert from 'assert'
import axios from 'axios'
import type { InterpolationOptions } from 'node-polyglot'
import type { Address } from 'viem'

import { getInboundAddressDataForChain } from '../../thorchain-utils'
import type {
  CommonTradeQuoteInput,
  CosmosSdkFeeData,
  EvmTransactionRequest,
  GetTradeRateInput,
  GetUnsignedCosmosSdkTransactionArgs,
  GetUnsignedEvmTransactionArgs,
  GetUnsignedUtxoTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
  UtxoFeeData,
} from '../../types'
import {
  checkSafeTransactionStatus,
  isExecutableTradeQuote,
  isExecutableTradeStep,
} from '../../utils'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT } from './constants'
import { getThorTxInfo as getEvmThorTxInfo } from './evm/utils/getThorTxData'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getThorTradeRate } from './getThorTradeRate/getTradeRate'
import type { ThorEvmTradeQuote, ThornodeStatusResponse, ThornodeTxResponse } from './types'
import { getCallDataFromQuote } from './utils/getCallDataFromQuote'
import { getLatestThorTxStatusMessage } from './utils/getLatestThorTxStatusMessage'
import { TradeType } from './utils/longTailHelpers'
import { parseThorBuyTxHash } from './utils/parseThorBuyTxHash'
import { getThorTxInfo as getUtxoThorTxInfo } from './utxo/utils/getThorTxData'

const deductOutboundRuneFee = (fee: string): string => {
  // 0.02 RUNE is automatically charged on outbound transactions
  // the returned is the difference of any additional fee over the default 0.02 RUNE (ie. tx.fee >= 2000001)
  const feeMinusAutomaticOutboundFee = bnOrZero(fee).minus(THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT)
  return feeMinusAutomaticOutboundFee.gt(0) ? feeMinusAutomaticOutboundFee.toString() : '0'
}

export const thorchainApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const { affiliateBps } = input

    return await getThorTradeQuote(
      {
        ...input,
        affiliateBps,
      },
      deps,
    )
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const { affiliateBps } = input

    return await getThorTradeRate(
      {
        ...input,
        affiliateBps,
      },
      deps,
    )
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const {
      router,
      vault,
      aggregator,
      data: _data,
      steps,
      memo: tcMemo,
      tradeType,
      expiry,
      longtailData,
      slippageTolerancePercentageDecimal,
    } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = steps[0]

    if (!tcMemo) throw new Error('Cannot execute Tx without a memo')

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    switch (tradeType) {
      case TradeType.L1ToL1: {
        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router,
          vault,
        })

        const feeData = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: router,
          value,
          from,
          supportsEIP1559,
        })

        return {
          chainId: Number(fromChainId(chainId).chainReference),
          data,
          from,
          to: router,
          value,
          ...feeData,
        }
      }
      case TradeType.LongTailToL1: {
        assert(aggregator, 'aggregator required for thorchain longtail to l1 swaps')

        const expectedAmountOut = longtailData?.longtailToL1ExpectedAmountOut ?? '0'
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(
          bnOrZero(expectedAmountOut).gt(0),
          'expected expectedAmountOut to be a positive amount',
        )

        const amountOutMin = BigInt(
          bnOrZero(expectedAmountOut)
            .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
            .toFixed(0, BigNumber.ROUND_UP),
        )

        // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade.
        assert(amountOutMin > 0n, 'expected expectedAmountOut to be a positive amount')

        const tcVault = vault as Address

        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router: aggregator,
          vault: tcVault,
        })

        const feeData = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: aggregator,
          value,
          from,
          supportsEIP1559,
        })

        return {
          chainId: Number(fromChainId(chainId).chainReference),
          data,
          from,
          to: aggregator,
          value,
          ...feeData,
        }
      }
      case TradeType.L1ToLongTail:
        const expectedAmountOut = longtailData?.L1ToLongtailExpectedAmountOut ?? '0'
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(
          bnOrZero(expectedAmountOut).gt(0),
          'expected expectedAmountOut to be a positive amount',
        )

        const { router: updatedRouter } = await getEvmThorTxInfo({
          sellAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
        })

        assert(router, 'router required for l1 to thorchain longtail swaps')

        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router,
          vault,
        })

        const feeData = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: updatedRouter,
          value,
          from,
          supportsEIP1559,
        })

        return {
          chainId: Number(fromChainId(chainId).chainReference),
          data,
          from,
          to: updatedRouter,
          value,
          ...feeData,
        }
      case TradeType.LongTailToLongTail:
        throw Error(`Unsupported trade type: ${TradeType}`)
      default:
        return assertUnreachable(tradeType)
    }
  },
  getEvmTransactionFees: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const {
      router,
      vault,
      aggregator,
      data: _data,
      steps,
      memo: tcMemo,
      tradeType,
      expiry,
      longtailData,
      slippageTolerancePercentageDecimal,
    } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = steps[0]

    if (!tcMemo) throw new Error('Cannot execute Tx without a memo')

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    switch (tradeType) {
      case TradeType.L1ToL1: {
        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router,
          vault,
        })
        const { networkFeeCryptoBaseUnit } = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: router,
          value,
          from,
          supportsEIP1559,
        })

        return networkFeeCryptoBaseUnit
      }
      case TradeType.LongTailToL1: {
        assert(aggregator, 'aggregator required for thorchain longtail to l1 swaps')

        const expectedAmountOut = longtailData?.longtailToL1ExpectedAmountOut ?? '0'
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(
          bnOrZero(expectedAmountOut).gt(0),
          'expected expectedAmountOut to be a positive amount',
        )

        const amountOutMin = BigInt(
          bnOrZero(expectedAmountOut)
            .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
            .toFixed(0, BigNumber.ROUND_UP),
        )

        // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade.
        assert(amountOutMin > 0n, 'expected expectedAmountOut to be a positive amount')

        const tcVault = vault as Address

        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router: aggregator,
          vault: tcVault,
        })

        const { networkFeeCryptoBaseUnit } = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: aggregator,
          value,
          from,
          supportsEIP1559,
        })

        return networkFeeCryptoBaseUnit
      }
      case TradeType.L1ToLongTail:
        const expectedAmountOut = longtailData?.L1ToLongtailExpectedAmountOut
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(
          bnOrZero(expectedAmountOut).gt(0),
          'expected expectedAmountOut to be a positive amount',
        )

        const { router: updatedRouter } = await getEvmThorTxInfo({
          sellAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
        })

        assert(router, 'router required for l1 to thorchain longtail swaps')

        const data = await getCallDataFromQuote({
          data: _data,
          tradeType,
          sellAsset,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
          longtailData,
          slippageTolerancePercentageDecimal,
          router,
          vault,
        })

        const { networkFeeCryptoBaseUnit } = await evm.getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data,
          to: updatedRouter,
          value,
          from,
          supportsEIP1559,
        })

        return networkFeeCryptoBaseUnit
      case TradeType.LongTailToLongTail:
        throw Error(`Unsupported trade type: ${TradeType}`)
      default:
        return assertUnreachable(tradeType)
    }
  },

  getUnsignedUtxoTransaction: async ({
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
    config,
  }: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const firstStep = steps[0]

    if (!isExecutableTradeStep(firstStep)) throw new Error('Unable to execute step')

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      firstStep

    if (!memo) throw new Error('Cannot execute Tx without a memo')

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
      config,
    })

    return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to: vault,
      accountNumber,
      // skip address validation for thorchain vault addresses as they may exceed the risk score threshold, but are still valid for use
      skipToAddressValidation: true,
      chainSpecific: {
        accountType,
        opReturnData,
        // TODO: split up getTradeQuote into separate function per chain family to negate need for cast
        satoshiPerByte: (feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({
    tradeQuote,
    xpub,
    assertGetUtxoChainAdapter,
    config,
  }: GetUnsignedUtxoTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const firstStep = steps[0]

    if (!isExecutableTradeStep(firstStep)) throw new Error('Unable to execute step')

    const { sellAsset } = firstStep

    const adapter = assertGetUtxoChainAdapter(firstStep.sellAsset.chainId)

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
      config,
    })

    const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
      to: vault,
      value: firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: {
        pubkey: xpub,
        opReturnData,
      },
      sendMax: false,
    }

    const feeData = await adapter.getFeeData(getFeeDataInput)

    return feeData.fast.txFee
  },

  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    chainId,
    from,
    config,
  }: GetUnsignedCosmosSdkTransactionArgs): Promise<StdSignDoc> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } = steps[0]

    if (!memo) throw new Error('Cannot execute Tx without a memo')

    // TODO: split up getTradeQuote into separate function per chain family to negate need for cast
    const gas = (feeData.chainSpecific as CosmosSdkFeeData).estimatedGasCryptoBaseUnit
    const networkFee = feeData.networkFeeCryptoBaseUnit ?? '0'

    const { fee, msg, account } = await (async () => {
      switch (sellAsset.assetId) {
        case thorchainAssetId: {
          const fee: StdFee = {
            amount: [{ amount: deductOutboundRuneFee(networkFee), denom: 'rune' }],
            gas,
          }

          // https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
          const msg: cosmossdkChainAdapter.ThorchainMsgDeposit = {
            type: cosmossdkChainAdapter.ThorchainMessageType.MsgDeposit,
            value: {
              coins: [
                { asset: 'THOR.RUNE', amount: sellAmountIncludingProtocolFeesCryptoBaseUnit },
              ],
              memo,
              signer: from,
            },
          }

          const api = new cosmossdk.thorchain.V1Api(
            new cosmossdk.thorchain.Configuration({
              basePath: config.VITE_UNCHAINED_THORCHAIN_HTTP_URL,
            }),
          )

          const account = await api.getAccount({ pubkey: from })

          return { fee, msg, account }
        }
        case tcyAssetId: {
          // Another day in Cosmos SDK land, yes TCY is a native asset, but TCY is the fee asset so we *do* need both
          const fee: StdFee = {
            amount: [{ amount: deductOutboundRuneFee(networkFee), denom: 'rune' }],
            gas,
          }

          // https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
          const msg: cosmossdkChainAdapter.ThorchainMsgDeposit = {
            type: cosmossdkChainAdapter.ThorchainMessageType.MsgDeposit,
            value: {
              coins: [{ asset: 'THOR.TCY', amount: sellAmountIncludingProtocolFeesCryptoBaseUnit }],
              memo,
              signer: from,
            },
          }

          const api = new cosmossdk.thorchain.V1Api(
            new cosmossdk.thorchain.Configuration({
              basePath: config.VITE_UNCHAINED_THORCHAIN_HTTP_URL,
            }),
          )

          const account = await api.getAccount({ pubkey: from })

          return { fee, msg, account }
        }

        case cosmosAssetId: {
          const fee: StdFee = {
            amount: [{ amount: networkFee, denom: 'uatom' }],
            gas,
          }

          const daemonUrl = config.VITE_THORCHAIN_NODE_URL
          const maybeGaiaAddressData = await getInboundAddressDataForChain(daemonUrl, cosmosAssetId)
          if (maybeGaiaAddressData.isErr()) throw maybeGaiaAddressData.unwrapErr()
          const gaiaAddressData = maybeGaiaAddressData.unwrap()
          const vault = gaiaAddressData.address

          const msg: cosmossdkChainAdapter.CosmosSdkMsgSend = {
            type: cosmossdkChainAdapter.CosmosSdkMessageType.MsgSend,
            value: {
              amount: [{ amount: sellAmountIncludingProtocolFeesCryptoBaseUnit, denom: 'uatom' }],
              from_address: from,
              to_address: vault,
            },
          }

          const api = new cosmossdk.cosmos.V1Api(
            new cosmossdk.cosmos.Configuration({
              basePath: config.VITE_UNCHAINED_COSMOS_HTTP_URL,
            }),
          )

          const account = await api.getAccount({ pubkey: from })

          return { fee, msg, account }
        }

        default:
          throw Error(`Unsupported sellAsset.assetId '${sellAsset.assetId}'`)
      }
    })()

    return {
      chain_id: fromChainId(chainId).chainReference,
      account_number: account.accountNumber.toString(),
      sequence: account.sequence.toString(),
      fee,
      msgs: [msg],
      memo,
    }
  },
  getCosmosSdkTransactionFees: async (
    input: GetUnsignedCosmosSdkTransactionArgs,
  ): Promise<string> => {
    const { assertGetCosmosSdkChainAdapter, tradeQuote, chainId } = input

    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    const adapter = assertGetCosmosSdkChainAdapter(chainId)

    const feeData = await adapter.getFeeData({})

    return feeData.fast.txFee
  },

  checkTradeStatus: async ({
    txHash,
    chainId,
    accountId,
    fetchIsSmartContractAddressQuery,
    config,
    assertGetEvmChainAdapter,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    try {
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

      const thorTxHash = txHash.replace(/^0x/, '')

      // not using monadic axios, this is intentional for simplicity in this non-monadic context
      const [{ data: txData }, { data: txStatusData }] = await Promise.all([
        axios.get<ThornodeTxResponse>(
          `${config.VITE_THORCHAIN_NODE_URL}/thorchain/tx/${thorTxHash}`,
        ),
        axios.get<ThornodeStatusResponse>(
          `${config.VITE_THORCHAIN_NODE_URL}/thorchain/tx/status/${thorTxHash}`,
        ),
      ])

      // We care about txStatusData errors because it drives all of the status logic.
      if ('error' in txStatusData) {
        return {
          buyTxHash: undefined,
          status: TxStatus.Unknown,
          message: undefined,
        }
      }

      // We use planned_out_txs to determine the number of out txs because we don't want to derive
      // swap completion based on the length of out_txs which is populated as the trade executed
      const numOutTxs = txStatusData.planned_out_txs?.length ?? 0
      const lastOutTx = txStatusData.out_txs?.[numOutTxs - 1]

      const buyTxHash = parseThorBuyTxHash(txHash, lastOutTx)

      const hasOutboundL1Tx = lastOutTx !== undefined && lastOutTx.chain !== 'THOR'
      const hasOutboundRuneTx = lastOutTx !== undefined && lastOutTx.chain === 'THOR'

      if (txStatusData.planned_out_txs?.some(plannedOutTx => plannedOutTx.refund)) {
        return {
          buyTxHash,
          status: TxStatus.Failed,
          message: undefined,
        }
      }

      // We consider the transaction confirmed as soon as we have a buyTxHash
      // For UTXOs, this means that the swap will be confirmed as soon as Txs hit the mempool
      // Which is actually correct, as we update UTXO balances optimistically
      if (!('error' in txData) && buyTxHash && (hasOutboundL1Tx || hasOutboundRuneTx)) {
        return {
          buyTxHash,
          status: TxStatus.Confirmed,
          message: undefined,
        }
      }

      const message = getLatestThorTxStatusMessage(txStatusData, hasOutboundL1Tx)
      return {
        buyTxHash,
        status: TxStatus.Pending,
        message,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }
  },
}
