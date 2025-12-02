import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { TronWeb } from 'tronweb'

import type { GetUnsignedTronTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

export const getTronTransactionFees = async (
  args: GetUnsignedTronTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { tradeQuote, stepIndex, assertGetTronChainAdapter, config } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

  const { vault } = await getThorTxData({ sellAsset, config, swapperName })

  const adapter = assertGetTronChainAdapter(sellAsset.chainId)
  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

  try {
    if (contractAddress) {
      // TRC20 transfer - estimate energy cost from unchained-client
      const feeEstimate = await adapter.providers.http.estimateTRC20TransferFee({
        contractAddress,
        from: vault, // Use vault as placeholder for estimation
        to: vault,
        amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      })
      return feeEstimate
    } else {
      // TRX transfer with memo - build transaction to get accurate size
      const tronWeb = new TronWeb({ fullHost: adapter.providers.http.getRpcUrl() })

      // Build transaction
      let tx = await tronWeb.transactionBuilder.sendTrx(
        vault,
        Number(sellAmountIncludingProtocolFeesCryptoBaseUnit),
        vault,
      )

      // Add memo to get accurate size with memo overhead
      tx = await tronWeb.transactionBuilder.addUpdateData(tx, memo, 'utf8')

      // Serialize and estimate bandwidth-based fee
      const serializedTx = tronWeb.utils.transaction.txJsonToPb(tx).serializeBinary()
      const feeEstimate = await adapter.providers.http.estimateFees({
        estimateFeesBody: { serializedTx: Buffer.from(serializedTx).toString('hex') },
      })

      return feeEstimate
    }
  } catch (err) {
    // Fallback to conservative estimate if fee estimation fails
    // TRX transfer: ~1 TRX, TRC20: ~10 TRX
    return contractAddress ? '10000000' : '1000000'
  }
}
