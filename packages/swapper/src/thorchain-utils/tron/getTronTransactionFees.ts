import { bnOrZero, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { TronWeb } from 'tronweb'

import type { GetUnsignedTronTransactionArgs, SwapperName } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import type { ThorTradeQuote } from '../types'
import { getThorTxData } from './getThorTxData'

const getChainPrices = async (
  rpcUrl: string,
): Promise<{ bandwidthPrice: number; energyPrice: number }> => {
  try {
    const tronWeb = new TronWeb({ fullHost: rpcUrl })
    const params = await tronWeb.trx.getChainParameters()
    const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
    const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 420
    return { bandwidthPrice, energyPrice }
  } catch (_err) {
    return { bandwidthPrice: 1000, energyPrice: 420 }
  }
}

export const getTronTransactionFees = async (
  args: GetUnsignedTronTransactionArgs,
  swapperName: SwapperName,
): Promise<string> => {
  const { tradeQuote, stepIndex, config, from } = args

  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const { memo } = tradeQuote as ThorTradeQuote
  if (!memo) throw new Error('Memo is required')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

  const { vault } = await getThorTxData({ sellAsset, config, swapperName })

  const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
  const rpcUrl = config.VITE_TRON_NODE_URL

  try {
    const tronWeb = new TronWeb({ fullHost: rpcUrl })

    if (contractAddress) {
      // TRC20 transfer - estimate energy cost
      const { energyPrice } = await getChainPrices(rpcUrl)

      const result = await tronWeb.transactionBuilder.triggerConstantContract(
        contractAddress,
        'transfer(address,uint256)',
        {},
        [
          { type: 'address', value: vault },
          { type: 'uint256', value: sellAmountIncludingProtocolFeesCryptoBaseUnit },
        ],
        from,
      )

      const energyUsed = result.energy_used ?? 65000 // Conservative default for TRC20 transfer
      const feeInSun = energyUsed * energyPrice

      return String(feeInSun)
    } else {
      // TRX transfer with memo - build transaction to get accurate size
      const { bandwidthPrice } = await getChainPrices(rpcUrl)

      let tx = await tronWeb.transactionBuilder.sendTrx(
        vault,
        bnOrZero(sellAmountIncludingProtocolFeesCryptoBaseUnit).toNumber(),
        from,
      )

      // Add memo to get accurate size with memo overhead
      const txWithMemo = await tronWeb.transactionBuilder.addUpdateData(tx, memo, 'utf8')

      // Calculate bandwidth fee from transaction size
      const rawDataBytes = txWithMemo.raw_data_hex ? txWithMemo.raw_data_hex.length / 2 : 268
      const signatureBytes = 65
      const totalBytes = rawDataBytes + signatureBytes

      const feeInSun = totalBytes * bandwidthPrice
      return String(feeInSun)
    }
  } catch (err) {
    // Fallback to conservative estimate if fee estimation fails
    // TRX transfer: ~1 TRX, TRC20: ~10 TRX
    return contractAddress ? '10000000' : '1000000'
  }
}
