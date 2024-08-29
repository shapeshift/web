import type { StdSignDoc } from '@cosmjs/amino'
import type { StdFee } from '@keplr-wallet/types'
import { cosmosAssetId, fromAssetId, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import { cosmossdk as cosmossdkChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { cosmossdk, TxStatus } from '@shapeshiftoss/unchained-client'
import { assertUnreachable, BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import { type Result } from '@sniptt/monads/build'
import assert from 'assert'
import axios from 'axios'
import type { InterpolationOptions } from 'node-polyglot'
import type { Address } from 'viem'
import { encodeFunctionData, parseAbiItem } from 'viem'

import { getInboundAddressDataForChain } from '../../thorchain-utils'
import type {
  CosmosSdkFeeData,
  EvmTransactionRequest,
  GetTradeQuoteInput,
  GetUnsignedCosmosSdkTransactionArgs,
  GetUnsignedEvmTransactionArgs,
  GetUnsignedUtxoTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  UtxoFeeData,
} from '../../types'
import { checkSafeTransactionStatus } from '../../utils'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { THORCHAIN_OUTBOUND_FEE_RUNE_THOR_UNIT } from './constants'
import { getThorTxInfo as getEvmThorTxInfo } from './evm/utils/getThorTxData'
import type { ThorEvmTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import type { ThornodeStatusResponse } from './types'
import { checkOutboundTxConfirmations } from './utils/checkOutputTxConfirmations'
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
    input: GetTradeQuoteInput,
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

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const {
      router,
      vault,
      aggregator,
      data,
      steps,
      memo: tcMemo,
      tradeType,
      expiry,
      longtailData,
      slippageTolerancePercentageDecimal,
    } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = steps[0]

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    switch (tradeType) {
      case TradeType.L1ToL1: {
        const feeData = await getFees({
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

        const swapInAbiItem = parseAbiItem(
          'function swapIn(address tcRouter, address tcVault, string tcMemo, address token, uint256 amount, uint256 amountOutMin, uint256 deadline)',
        )

        const expectedAmountOut = longtailData?.longtailToL1ExpectedAmountOut ?? 0n
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(expectedAmountOut > 0n, 'expected expectedAmountOut to be a positive amount')

        const amountOutMin = BigInt(
          bnOrZero(expectedAmountOut.toString())
            .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
            .toFixed(0, BigNumber.ROUND_UP),
        )

        // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade.
        assert(amountOutMin > 0n, 'expected expectedAmountOut to be a positive amount')

        const tcRouter = router as Address
        const tcVault = vault as Address
        const token = fromAssetId(sellAsset.assetId).assetReference as Address
        const amount = BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit)
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
        const tenMinutes = BigInt(600)
        const deadline = currentTimestamp + tenMinutes
        const params = [tcRouter, tcVault, tcMemo, token, amount, amountOutMin, deadline] as const

        const swapInData = encodeFunctionData({
          abi: [swapInAbiItem],
          functionName: 'swapIn',
          args: params,
        })

        const feeData = await getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data: swapInData,
          to: aggregator,
          value,
          from,
          supportsEIP1559,
        })

        return {
          chainId: Number(fromChainId(chainId).chainReference),
          data: swapInData,
          from,
          to: aggregator,
          value,
          ...feeData,
        }
      }
      case TradeType.L1ToLongTail:
        const expectedAmountOut = longtailData?.L1ToLongtailExpectedAmountOut ?? 0n
        // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
        assert(expectedAmountOut > 0n, 'expected expectedAmountOut to be a positive amount')

        const { data: dataWithAmountOut, router: updatedRouter } = await getEvmThorTxInfo({
          sellAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo: tcMemo,
          expiry,
          config,
        })

        assert(router, 'router required for l1 to thorchain longtail swaps')

        const feeData = await getFees({
          adapter: assertGetEvmChainAdapter(chainId),
          data: dataWithAmountOut,
          to: updatedRouter,
          value,
          from,
          supportsEIP1559,
        })

        return {
          chainId: Number(fromChainId(chainId).chainReference),
          data: dataWithAmountOut,
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

  getUnsignedUtxoTransaction: async ({
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
    checkLedgerAppOpenIfLedgerConnected,
    config,
  }: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      steps[0]

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
      config,
    })

    return assertGetUtxoChainAdapter(sellAsset.chainId).buildSendApiTransaction({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub: xpub!,
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
      checkLedgerAppOpenIfLedgerConnected,
    })
  },

  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    chainId,
    from,
    config,
  }: GetUnsignedCosmosSdkTransactionArgs): Promise<StdSignDoc> => {
    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } = steps[0]

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
              basePath: config.REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL,
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

          const daemonUrl = config.REACT_APP_THORCHAIN_NODE_URL
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
              basePath: config.REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
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

  checkTradeStatus: async ({
    txHash,
    chainId,
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
      const { data } = await axios.get<ThornodeStatusResponse>(
        `${config.REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/tx/status/${thorTxHash}`,
      )

      if ('error' in data) {
        return {
          buyTxHash: undefined,
          status: TxStatus.Unknown,
          message: undefined,
        }
      }

      const latestOutTx = data.out_txs?.[data.out_txs.length - 1]
      const hasOutboundTx = latestOutTx?.chain !== 'THOR'

      const buyTxHash = parseThorBuyTxHash(txHash, latestOutTx)

      // if we have an outbound transaction (non rune) and associated buyTxHash, check if it's been confirmed on-chain
      if (hasOutboundTx && buyTxHash) {
        const outboundTxConfirmations = await checkOutboundTxConfirmations(
          buyTxHash,
          latestOutTx,
          config,
        )

        if (outboundTxConfirmations !== undefined && outboundTxConfirmations > 0) {
          return {
            buyTxHash,
            status: TxStatus.Confirmed,
            message: undefined,
          }
        }
      }

      const { message, status } = getLatestThorTxStatusMessage(data, hasOutboundTx)

      return {
        buyTxHash,
        status,
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
