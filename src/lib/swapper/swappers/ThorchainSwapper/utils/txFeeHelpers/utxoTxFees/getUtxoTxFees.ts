import type { AssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput, UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from 'lib/bignumber/bignumber'
import type { ProtocolFee, QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ThorUtxoSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/types'

type GetUtxoTxFeesInput = {
  opReturnData: string
  vault: string
  sellAmountCryptoBaseUnit: string
  sellAdapter: UtxoBaseAdapter<ThorUtxoSupportedChainId>
  pubkey: string
  protocolFees: Record<AssetId, ProtocolFee>
}

export const getUtxoTxFees = async ({
  opReturnData,
  vault,
  sellAmountCryptoBaseUnit,
  sellAdapter,
  pubkey,
  protocolFees,
}: GetUtxoTxFeesInput): Promise<QuoteFeeData<ThorUtxoSupportedChainId>> => {
  try {
    const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
      to: vault,
      value: sellAmountCryptoBaseUnit,
      chainSpecific: { pubkey, opReturnData },
    }
    const feeDataOptions = await sellAdapter.getFeeData(getFeeDataInput)

    const feeData = feeDataOptions['fast']

    // BCH specific hack:
    // For some reason when sats per byte comes back as 1 (which is very common for bch)
    // broadcast will fail because it thinks the intrinsic fee is too low
    // it feels like possibly an off by-a-few-bytes bug with how we are using coinselect with opReturnData
    // Bumping BCH fees here resolves this for now until we have time to find a better solution
    const isFromBch = sellAdapter.getChainId() === KnownChainIds.BitcoinCashMainnet
    const feeMultiplier = isFromBch ? bn(2) : bn(1)

    const networkFee = feeMultiplier.times(feeData.txFee).dp(0).toString()
    const satsPerByte = feeMultiplier.times(feeData.chainSpecific.satoshiPerByte).dp(0).toString()

    return {
      networkFeeCryptoBaseUnit: networkFee,
      protocolFees,
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
    throw new SwapError('[getUtxoTxFees]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
