import { cosmosAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { thorchain } from '@shapeshiftoss/chain-adapters'

import type { ThorTradeQuote } from '../../thorchain-utils'
import {
  checkTradeStatus,
  cosmossdk,
  evm,
  getInboundAddressDataForChain,
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
  getUnsignedEvmTransaction: input => evm.getUnsignedEvmTransaction({ ...input, swapperName }),
  getEvmTransactionFees: input => evm.getEvmTransactionFees({ ...input, swapperName }),
  getUnsignedUtxoTransaction: input => utxo.getUnsignedUtxoTransaction({ ...input, swapperName }),
  getUtxoTransactionFees: input => utxo.getUtxoTransactionFees({ ...input, swapperName }),
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
      case tcyAssetId: {
        const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId) as thorchain.ChainAdapter

        const { txToSign } = await adapter.buildDepositTransaction({
          accountNumber,
          from,
          value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          memo,
          chainSpecific: { gas, fee, coin: tcyAssetId ? 'THOR.TCY' : 'THOR.RUNE' },
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
  getCosmosSdkTransactionFees: cosmossdk.getCosmosSdkTransactionFees,
  checkTradeStatus: input => {
    const { config } = input
    const url = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    return checkTradeStatus({ ...input, url, nativeChain: 'THOR' })
  },
}
