import type { AssetReference } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
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
    const { average: fee } = await adapter.getGasFeeData()

    // this is a good value to cover all thortrades out of EVMs
    // in the future we may want to look at doing this more precisely and in a future-proof way
    // TODO: calculate this dynamically
    const txFee = bn(THOR_EVM_GAS_LIMIT).times(bnOrZero(fee.maxFeePerGas ?? fee.gasPrice))

    const approvalFee =
      sellAssetReference &&
      bnOrZero(APPROVAL_GAS_LIMIT)
        .multipliedBy(bnOrZero(fee.maxFeePerGas ?? fee.gasPrice))
        .toString()

    return {
      networkFeeCryptoBaseUnit: txFee.toFixed(0),
      chainSpecific: {
        estimatedGasCryptoBaseUnit: THOR_EVM_GAS_LIMIT,
        gasPriceCryptoBaseUnit: fee.gasPrice,
        maxFeePerGas: fee.maxFeePerGas,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
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
