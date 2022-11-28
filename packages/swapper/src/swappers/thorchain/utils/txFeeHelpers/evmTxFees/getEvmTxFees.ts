import { AssetReference } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'

import {
  EvmSupportedChainAdapter,
  EvmSupportedChainIds,
  QuoteFeeData,
  SwapError,
  SwapErrorTypes,
} from '../../../../../api'
import { bn, bnOrZero } from '../../../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../../../utils/constants'
import { THOR_EVM_GAS_LIMIT } from '../../constants'

type GetEvmTxFeesArgs = {
  adapter: EvmSupportedChainAdapter
  sellAssetReference: AssetReference | string
  buyAssetTradeFeeUsd: string
}

export const getEvmTxFees = async ({
  adapter,
  sellAssetReference,
  buyAssetTradeFeeUsd,
}: GetEvmTxFeesArgs): Promise<QuoteFeeData<EvmSupportedChainIds>> => {
  try {
    const gasFeeData = await adapter.getGasFeeData()

    // this is a good value to cover all thortrades out of EVMs
    // in the future we may want to look at doing this more precisely and in a future-proof way
    // TODO: calculate this dynamically
    const gasLimit = THOR_EVM_GAS_LIMIT

    const feeDataOptions = {
      fast: {
        txFee: bn(gasLimit).times(gasFeeData[FeeDataKey.Fast].gasPrice).toString(),
        chainSpecific: {
          gasPrice: gasFeeData[FeeDataKey.Fast].gasPrice,
          gasLimit,
        },
      },
    }

    const feeData = feeDataOptions['fast']

    return {
      networkFee: feeData.txFee,
      chainSpecific: {
        estimatedGas: feeData.chainSpecific.gasLimit,
        gasPrice: feeData.chainSpecific.gasPrice,
        approvalFee:
          sellAssetReference &&
          bnOrZero(APPROVAL_GAS_LIMIT)
            .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
            .toString(),
      },
      buyAssetTradeFeeUsd,
      sellAssetTradeFeeUsd: '0',
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
