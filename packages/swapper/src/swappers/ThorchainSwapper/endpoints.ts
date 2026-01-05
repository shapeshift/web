import { cosmosAssetId, rujiAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { thorchain } from '@shapeshiftoss/chain-adapters'

import type { ThorTradeQuote } from '../../thorchain-utils'
import {
  checkTradeStatus,
  cosmossdk,
  evm,
  getInboundAddressDataForChain,
  tron,
  utxo,
} from '../../thorchain-utils'
import type { CosmosSdkFeeData, SwapperApi } from '../../types'
import { SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'

const swapperName = SwapperName.Thorchain

export const thorchainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedEvmTransaction: input => evm.getUnsignedEvmTransaction(input, swapperName),
  getEvmTransactionFees: input => evm.getEvmTransactionFees(input, swapperName),
  getUnsignedUtxoTransaction: input => utxo.getUnsignedUtxoTransaction(input, swapperName),
  getUtxoTransactionFees: input => utxo.getUtxoTransactionFees(input, swapperName),
  getUnsignedTronTransaction: input => tron.getUnsignedTronTransaction(input, swapperName),
  getTronTransactionFees: input => tron.getTronTransactionFees(input, swapperName),
  getUnsignedCosmosSdkTransaction: async ({
    tradeQuote,
    stepIndex,
    from,
    config,
    assertGetCosmosSdkChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { memo } = tradeQuote as ThorTradeQuote
    if (!memo) throw new Error('Memo is required')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset, feeData } =
      step

    const gas = (feeData.chainSpecific as CosmosSdkFeeData).estimatedGasCryptoBaseUnit
    const fee = feeData.networkFeeCryptoBaseUnit ?? '0'

    switch (sellAsset.assetId) {
      case thorchainAssetId:
      case rujiAssetId:
      case tcyAssetId: {
        const coin = (() => {
          if (sellAsset.assetId === tcyAssetId) return 'THOR.TCY'
          if (sellAsset.assetId === rujiAssetId) return 'THOR.RUJI'
          return 'THOR.RUNE'
        })()
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId) as thorchain.ChainAdapter

        const { txToSign } = await adapter.buildDepositTransaction({
          accountNumber,
          from,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: {
            gas,
            fee,
            coin,
          },
        })

        return txToSign
      }
      case cosmosAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

        const url = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`

        const data = await getInboundAddressDataForChain(url, cosmosAssetId, true, swapperName)
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
  getCosmosSdkTransactionFees: input => cosmossdk.getCosmosSdkTransactionFees(input),
  checkTradeStatus: input => {
    const { config } = input

    const nodeUrl = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    const apiUrl = `${config.VITE_UNCHAINED_THORCHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'THOR' })
  },
}
