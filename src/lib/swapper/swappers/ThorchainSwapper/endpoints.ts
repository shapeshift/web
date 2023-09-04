import type { AminoMsg, StdSignDoc } from '@cosmjs/amino'
import type { StdFee } from '@keplr-wallet/types'
import { cosmosAssetId, fromChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { cosmossdk, evm, TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { getConfig } from 'config'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getThorTxInfo as getUtxoThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'
import type {
  CosmosSdkFeeData,
  EvmTransactionRequest,
  GetTradeQuoteInput,
  GetUnsignedCosmosSdkTransactionArgs,
  GetUnsignedEvmTransactionArgs,
  GetUnsignedUtxoTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
  UtxoFeeData,
} from 'lib/swapper/types'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { THORCHAIN_OUTBOUND_FEE_RUNE } from './constants'
import type { ThorEvmTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getTradeTxs } from './getTradeTxs/getTradeTxs'
import { THORCHAIN_AFFILIATE_FEE_BPS } from './utils/constants'
import { getInboundAddressDataForChain } from './utils/getInboundAddressDataForChain'

const deductOutboundRuneFee = (fee: string): string => {
  // 0.02 RUNE is automatically charged on outbound transactions
  // the returned is the difference of any additional fee over the default 0.02 RUNE (ie. tx.fee >= 2000001)
  const feeMinusAutomaticOutboundFee = bnOrZero(fee).minus(THORCHAIN_OUTBOUND_FEE_RUNE)
  return feeMinusAutomaticOutboundFee.gt(0) ? feeMinusAutomaticOutboundFee.toString() : '0'
}

export const thorchainApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const applyThorSwapAffiliateFees = getConfig().REACT_APP_FEATURE_THOR_SWAP_AFFILIATE_FEES

    const affiliateBps = applyThorSwapAffiliateFees
      ? THORCHAIN_AFFILIATE_FEE_BPS
      : input.affiliateBps

    return await getThorTradeQuote({
      ...input,
      affiliateBps,
    })
  },

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const { router: to, data, steps } = tradeQuote as ThorEvmTradeQuote
    const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = steps[0]

    const value = isNativeEvmAsset(sellAsset.assetId)
      ? sellAmountIncludingProtocolFeesCryptoBaseUnit
      : '0'

    const api = (() => {
      switch (chainId) {
        case KnownChainIds.EthereumMainnet:
          return new evm.ethereum.V1Api(
            new evm.ethereum.Configuration({
              basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
            }),
          )
        case KnownChainIds.AvalancheMainnet:
          return new evm.avalanche.V1Api(
            new evm.avalanche.Configuration({
              basePath: getConfig().REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL,
            }),
          )
        default:
          throw Error(`Unsupported chainId '${chainId}'`)
      }
    })()

    const [{ gasLimit }, { average: gasFees }] = await Promise.all([
      api.estimateGas({ data, from, to, value }),
      api.getGasFees(),
    ])

    return {
      chainId: Number(fromChainId(chainId).chainReference),
      data,
      from,
      gasLimit,
      to,
      value,
      ...gasFees,
    }
  },

  getUnsignedUtxoTransaction: async ({
    tradeQuote,
    chainId,
    xpub,
    accountType,
  }: GetUnsignedUtxoTransactionArgs): Promise<BTCSignTx> => {
    const utxoChainAdapter = assertGetUtxoChainAdapter(chainId)

    // TODO: pull these from db using id so we don't have type zoo and casting hell
    const { steps, memo } = tradeQuote as ThorEvmTradeQuote
    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      steps[0]

    const { vault, opReturnData } = await getUtxoThorTxInfo({
      sellAsset,
      xpub,
      memo,
    })

    return utxoChainAdapter.buildSendApiTransaction({
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub: xpub!,
      to: vault,
      accountNumber,
      chainSpecific: {
        accountType,
        opReturnData,
        // TODO: split up getTradeQuote into separate function per chain family to negate need for cast
        satoshiPerByte: (feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },

  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    chainId,
    from,
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
          const msg: AminoMsg = {
            type: 'thorchain/MsgDeposit',
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
              basePath: getConfig().REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL,
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

          const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
          const maybeGaiaAddressData = await getInboundAddressDataForChain(daemonUrl, cosmosAssetId)
          if (maybeGaiaAddressData.isErr()) throw maybeGaiaAddressData.unwrapErr()
          const gaiaAddressData = maybeGaiaAddressData.unwrap()
          const vault = gaiaAddressData.address

          const msg: AminoMsg = {
            type: 'cosmos-sdk/MsgSend',
            value: {
              amount: [{ amount: sellAmountIncludingProtocolFeesCryptoBaseUnit, denom: 'uatom' }],
              from_address: from,
              to_address: vault,
            },
          }

          const api = new cosmossdk.cosmos.V1Api(
            new cosmossdk.cosmos.Configuration({
              basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
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
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    try {
      // thorchain swapper uses txId to get tx status (not trade ID)
      const { buyTxId: buyTxHash } = await getTradeTxs(txHash)
      const status = buyTxHash ? TxStatus.Confirmed : TxStatus.Pending

      return {
        buyTxHash,
        status,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Failed,
        message: undefined,
      }
    }
  },
}
