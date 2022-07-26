import { Asset } from '@shapeshiftoss/asset-service'
import { AssetReference } from '@shapeshiftoss/caip'
import { ChainAdapterManager, ethereum, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { QuoteFeeData, SwapError, SwapErrorTypes } from '../../../../../api'
import { bn, bnOrZero } from '../../../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../../../utils/constants'
import { ThorchainSwapperDeps } from '../../../types'
import { estimateTradeFee } from '../../estimateTradeFee/estimateTradeFee'

export const getEthTxFees = async ({
  deps,
  data,
  router,
  buyAsset,
  sellAmount,
  adapterManager,
  receiveAddress,
  sellAssetReference
}: {
  deps: ThorchainSwapperDeps
  data: string
  router: string
  buyAsset: Asset
  sellAmount: string
  sellAssetReference: AssetReference | string
  adapterManager: ChainAdapterManager
  receiveAddress: string
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
          details: { chainId: KnownChainIds.EthereumMainnet }
        }
      )
    }

    let feeDataOptions
    try {
      feeDataOptions = await adapter.getFeeData({
        to: router,
        value: sellAmount,
        chainSpecific: { from: receiveAddress, contractData: data }
      })
    } catch (e) {
      // Fallback to fixed fee amount in case of failure so that quote will not fail
      // eslint-disable-next-line no-console
      console.debug(
        '[ThorSwapper:getEthTxFees] precise gas estimate failed, falling back on hard coded limit'
      )
      const gasFeeData = await adapter.getGasFeeData()
      const gasLimit = '100000' // good value to cover all thortrades out of eth/erc20

      feeDataOptions = {
        fast: {
          txFee: bn(gasLimit).times(gasFeeData[FeeDataKey.Fast].gasPrice).toString(),
          chainSpecific: {
            gasPrice: gasFeeData[FeeDataKey.Fast].gasPrice,
            gasLimit
          }
        }
      }
    }

    const feeData = feeDataOptions['fast']
    const tradeFee = await estimateTradeFee(deps, buyAsset.assetId)

    return {
      fee: feeData.txFee,
      chainSpecific: {
        estimatedGas: feeData.chainSpecific.gasLimit,
        gasPrice: feeData.chainSpecific.gasPrice,
        approvalFee:
          sellAssetReference &&
          bnOrZero(APPROVAL_GAS_LIMIT)
            .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
            .toString()
      },
      tradeFee
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
