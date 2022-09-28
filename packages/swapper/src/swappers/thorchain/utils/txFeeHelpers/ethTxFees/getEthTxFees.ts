import { AssetReference } from '@shapeshiftoss/caip'
import { ChainAdapterManager, ethereum, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { QuoteFeeData, SwapError, SwapErrorTypes } from '../../../../../api'
import { bn, bnOrZero } from '../../../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../../../utils/constants'
import { THOR_ETH_GAS_LIMIT } from '../../constants'

export const getEthTxFees = async ({
  adapterManager,
  sellAssetReference,
  buyAssetTradeFeeUsd,
}: {
  adapterManager: ChainAdapterManager
  sellAssetReference: AssetReference | string
  buyAssetTradeFeeUsd: string
}): Promise<QuoteFeeData<KnownChainIds.EthereumMainnet>> => {
  try {
    const adapter = adapterManager.get(KnownChainIds.EthereumMainnet) as
      | ethereum.ChainAdapter
      | undefined
    if (!adapter) {
      throw new SwapError(
        `[getThorTxInfo] - No chain adapter found for ${KnownChainIds.EthereumMainnet}.`,
        {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { chainId: KnownChainIds.EthereumMainnet },
        },
      )
    }

    const gasFeeData = await adapter.getGasFeeData()

    // this is a good value to cover all thortrades out of eth/erc20
    // in the future we may want to look at doing this more precisely and in a future-proof way
    const gasLimit = THOR_ETH_GAS_LIMIT

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
      fee: feeData.txFee, // TODO: remove once web has been updated
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
      tradeFee: buyAssetTradeFeeUsd, // TODO: remove once web has been updated
      buyAssetTradeFeeUsd,
      sellAssetTradeFeeUsd: '0',
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
