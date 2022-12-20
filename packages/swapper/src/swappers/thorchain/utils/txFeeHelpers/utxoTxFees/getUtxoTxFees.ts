import { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { QuoteFeeData, SwapError, SwapErrorTypes, UtxoSupportedChainIds } from '../../../../../api'
import { bn } from '../../../../utils/bignumber'

type GetUtxoTxFeesInput = {
  opReturnData: string
  vault: string
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoBaseAdapter<UtxoSupportedChainIds>
  pubkey: string
  buyAssetTradeFeeUsd: string
  sendMax: boolean
}

export const getUtxoTxFees = async ({
  opReturnData,
  vault,
  sellAmountCryptoBaseUnit,
  sellAdapter,
  pubkey,
  buyAssetTradeFeeUsd,
  sendMax,
}: GetUtxoTxFeesInput): Promise<QuoteFeeData<UtxoSupportedChainIds>> => {
  try {
    const feeDataOptions = await sellAdapter.getFeeData({
      to: vault,
      value: sellAmountCryptoBaseUnit,
      chainSpecific: { pubkey, opReturnData },
      sendMax,
    })

    const feeData = feeDataOptions['fast']

    // BCH specific hack:
    // For some reason when sats per byte comes back as 1 (which is very common for bch)
    // broadcast will fail because it thinks the intrinsic fee is too low
    // it feels like possibly an off by-a-few-bytes bug with how we are using coinselect with opReturnData
    // Bumping BCH fees here resolves this for now until we have time to find a better solution
    const isFromBch = sellAdapter.getChainId() === KnownChainIds.BitcoinCashMainnet
    const feeMultiplier = isFromBch ? bn(1.5) : bn(1)

    const networkFee = feeMultiplier.times(feeData.txFee).dp(0).toString()
    const satsPerByte = feeMultiplier.times(feeData.chainSpecific.satoshiPerByte).dp(0).toString()

    return {
      networkFeeCryptoBaseUnit: networkFee,
      buyAssetTradeFeeUsd,
      sellAssetTradeFeeUsd: '0',
      chainSpecific: {
        satsPerByte,
        byteCount: bn(feeData.txFee)
          .dividedBy(feeData.chainSpecific.satoshiPerByte)
          .dp(0)
          .toString(),
      },
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUtxoTxFees]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
