import { mayachainAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { mayachain, SignTx } from '@shapeshiftoss/chain-adapters'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'

import type { ThorTradeQuote } from '../../thorchain-utils'
import {
  checkTradeStatus,
  cosmossdk,
  evm,
  getInboundAddressDataForChain,
  utxo,
} from '../../thorchain-utils'
import type { CosmosSdkFeeData, GetUnsignedCosmosSdkTransactionArgs, SwapperApi } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getThorTradeQuote } from './getThorTradeQuote/getTradeQuote'
import { getThorTradeRate } from './getThorTradeRate/getTradeRate'

export const mayachainApi: SwapperApi = {
  getTradeRate: getThorTradeRate,
  getTradeQuote: getThorTradeQuote,
  getUnsignedEvmTransaction: evm.getUnsignedEvmTransaction,
  getEvmTransactionFees: evm.getEvmTransactionFees,
  getUnsignedUtxoTransaction: utxo.getUnsignedUtxoTransaction,
  getUtxoTransactionFees: utxo.getUtxoTransactionFees,
  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    stepIndex,
    from,
    config,
    assertGetCosmosSdkChainAdapter,
  }: GetUnsignedCosmosSdkTransactionArgs): Promise<SignTx<CosmosSdkChainId>> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { memo } = tradeQuote as ThorTradeQuote
    if (!memo) throw new Error('Memo is required')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      step

    const gas = (feeData.chainSpecific as CosmosSdkFeeData).estimatedGasCryptoBaseUnit
    const fee = feeData.networkFeeCryptoBaseUnit ?? '0'

    switch (sellAsset.assetId) {
      case mayachainAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId) as mayachain.ChainAdapter

        const { txToSign } = await adapter.buildDepositTransaction({
          accountNumber,
          from,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: { gas, fee },
        })

        return txToSign
      }
      case thorchainAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

        const daemonUrl = config.VITE_MAYACHAIN_NODE_URL

        const data = await getInboundAddressDataForChain(daemonUrl, thorchainAssetId)
        if (data.isErr()) throw data.unwrapErr()

        const { address: vault } = data.unwrap()

        const { txToSign } = await adapter.buildSendApiTransaction({
          accountNumber,
          from,
          to: vault,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: { gas, fee },
        })

        return txToSign
      }

      default:
        throw Error(`Unsupported sellAsset: ${sellAsset.assetId}`)
    }
  },
  getCosmosSdkTransactionFees: cosmossdk.getCosmosSdkTransactionFees,
  checkTradeStatus: input => {
    const { config } = input
    const url = `${config.VITE_MAYACHAIN_NODE_URL}/lcd/mayachain`
    return checkTradeStatus({ ...input, url, nativeChain: 'MAYA' })
  },
}
