import type { EvmBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { bn } from 'lib/bignumber/bignumber'
import type { QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { THOR_EVM_GAS_LIMIT } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'

type GetEvmTxFeesArgs = {
  adapter: EvmBaseAdapter<ThorEvmSupportedChainId>
  buyAssetTradeFeeUsd: string
  sellAssetTradeFeeUsd: string
}

export const getEvmTxFees = async ({
  adapter,
  buyAssetTradeFeeUsd,
  sellAssetTradeFeeUsd,
}: GetEvmTxFeesArgs): Promise<QuoteFeeData<ThorEvmSupportedChainId>> => {
  try {
    const { average } = await adapter.getGasFeeData()

    // this is a good value to cover all thortrades out of EVMs
    // in the future we may want to look at doing this more precisely and in a future-proof way
    // TODO: calculate this dynamically
    const txFee = bn(THOR_EVM_GAS_LIMIT).times(average.gasPrice)

    return {
      networkFeeCryptoBaseUnit: txFee.toFixed(0),
      buyAssetTradeFeeUsd,
      sellAssetTradeFeeUsd,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
