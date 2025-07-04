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
import { SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './getTradeQuote'
import { getTradeRate } from './getTradeRate'

const swapperName = SwapperName.Mayachain

export const mayachainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedEvmTransaction: input => evm.getUnsignedEvmTransaction(input, swapperName),
  getEvmTransactionFees: input => evm.getEvmTransactionFees(input, swapperName),
  getUnsignedUtxoTransaction: input => utxo.getUnsignedUtxoTransaction(input, swapperName),
  getUtxoTransactionFees: input => utxo.getUtxoTransactionFees(input, swapperName),
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

        const url = `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`

        const data = await getInboundAddressDataForChain(url, thorchainAssetId, true, swapperName)
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

    const nodeUrl = `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`
    const apiUrl = `${config.VITE_UNCHAINED_MAYACHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'MAYA' })
  },
}
