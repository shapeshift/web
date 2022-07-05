import { bitcoin, ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Asset } from '@shapeshiftoss/types'

import { QuoteFeeData, SwapError, SwapErrorTypes } from '../../../../../api'
import { bn } from '../../../../utils/bignumber'
import { ThorchainSwapperDeps } from '../../../types'
import { estimateTradeFee } from '../../estimateTradeFee/estimateTradeFee'

export const getBtcTxFees = async ({
  deps,
  opReturnData,
  vault,
  buyAsset,
  sellAmount,
  adapterManager,
  pubkey
}: {
  deps: ThorchainSwapperDeps
  opReturnData: string
  vault: string
  buyAsset: Asset
  sellAmount: string
  adapterManager: ChainAdapterManager
  pubkey: string
}): Promise<QuoteFeeData<'bip122:000000000019d6689c085ae165831e93'>> => {
  try {
    const adapter = adapterManager.get('bip122:000000000019d6689c085ae165831e93') as
      | bitcoin.ChainAdapter
      | undefined
    if (!adapter)
      throw new SwapError(
        `[getBtcTxFees] - No chain adapter found for bip122:000000000019d6689c085ae165831e93.`,
        {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { chainId: 'bip122:000000000019d6689c085ae165831e93' }
        }
      )
    const feeDataOptions = await adapter.getFeeData({
      to: vault,
      value: sellAmount,
      chainSpecific: { pubkey, opReturnData }
    })

    const feeData = feeDataOptions['fast']
    const tradeFee = await estimateTradeFee(deps, buyAsset.assetId)

    return {
      fee: feeData.txFee,
      tradeFee,
      chainSpecific: {
        satsPerByte: feeData.chainSpecific.satoshiPerByte,
        byteCount: bn(feeData.txFee)
          .dividedBy(feeData.chainSpecific.satoshiPerByte)
          .dp(0)
          .toString()
      }
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getBtcTxFeess]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
