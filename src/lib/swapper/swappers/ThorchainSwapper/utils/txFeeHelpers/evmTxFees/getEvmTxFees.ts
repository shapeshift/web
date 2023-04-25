import type { AssetReference } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ThorEvmSupportedChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { THOR_EVM_GAS_LIMIT } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'

type GetEvmTxFeesArgs = {
  adapter: EvmBaseAdapter<ThorEvmSupportedChainId>
  sellAssetReference: AssetReference | string
  buyAssetTradeFeeUsd: string
}

export const getEvmTxFees = async ({
  adapter,
  sellAssetReference,
  buyAssetTradeFeeUsd,
}: GetEvmTxFeesArgs): Promise<QuoteFeeData<ThorEvmSupportedChainId>> => {
  try {
    const { average, fast } = await adapter.getGasFeeData()

    // use worst case average eip1559 vs fast legacy
    const maxGasPrice = bnOrZero(BigNumber.max(average.maxFeePerGas ?? 0, fast.gasPrice))

    // this is a good value to cover all thortrades out of EVMs
    // in the future we may want to look at doing this more precisely and in a future-proof way
    // TODO: calculate this dynamically
    const txFee = bn(THOR_EVM_GAS_LIMIT).times(maxGasPrice)

    const approvalFee = sellAssetReference && bn(APPROVAL_GAS_LIMIT).times(maxGasPrice).toFixed(0)

    return {
      networkFeeCryptoBaseUnit: txFee.toFixed(0),
      chainSpecific: {
        estimatedGasCryptoBaseUnit: THOR_EVM_GAS_LIMIT,
        gasPriceCryptoBaseUnit: fast.gasPrice, // fast gas price since it is underestimated currently
        maxFeePerGas: average.maxFeePerGas,
        maxPriorityFeePerGas: average.maxPriorityFeePerGas,
        approvalFeeCryptoBaseUnit: approvalFee,
      },
      buyAssetTradeFeeUsd,
      sellAssetTradeFeeUsd: '0',
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
