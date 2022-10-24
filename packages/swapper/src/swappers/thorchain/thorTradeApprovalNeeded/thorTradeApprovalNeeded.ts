import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ApprovalNeededInput, ApprovalNeededOutput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20AllowanceAbi } from '../../utils/abi/erc20Allowance-abi'
import { bnOrZero } from '../../utils/bignumber'
import { getERC20Allowance } from '../../utils/helpers/helpers'
import { ThorchainSwapperDeps } from '../types'

export const thorTradeApprovalNeeded = async ({
  deps,
  input,
}: {
  deps: ThorchainSwapperDeps
  input: ApprovalNeededInput<KnownChainIds.EthereumMainnet>
}): Promise<ApprovalNeededOutput> => {
  try {
    const { quote, wallet } = input
    const { sellAsset, bip44Params } = quote
    const { adapterManager, web3 } = deps

    const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)
    const { chainNamespace } = fromChainId(sellAsset.chainId)

    if (chainNamespace !== CHAIN_NAMESPACE.Evm) return { approvalNeeded: false }

    const adapter = adapterManager.get(sellAsset.chainId)

    if (!adapter)
      throw new SwapError(
        `[thorTradeApprovalNeeded] - no chain adapter found for chain Id: ${sellAsset.chainId}`,
        {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { chainId: sellAsset.chainId },
        },
      )

    // No approval needed for selling a fee asset
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return { approvalNeeded: false }
    }

    const receiveAddress = await adapter.getAddress({ wallet, bip44Params })

    if (!quote.allowanceContract) {
      throw new SwapError('[thorTradeApprovalNeeded] - allowanceTarget is required', {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId },
      })
    }

    const allowanceResult = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      sellAssetErc20Address,
      spenderAddress: quote.allowanceContract,
      ownerAddress: receiveAddress,
    })
    const allowanceOnChain = bnOrZero(allowanceResult)

    if (!quote.feeData.chainSpecific?.gasPrice)
      throw new SwapError('[thorTradeApprovalNeeded] - no gas price with quote', {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { feeData: quote.feeData },
      })
    return {
      approvalNeeded: allowanceOnChain.lt(bnOrZero(quote.sellAmountCryptoPrecision)),
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[thorTradeApprovalNeeded]', {
      cause: e,
      code: SwapErrorTypes.CHECK_APPROVAL_FAILED,
    })
  }
}
