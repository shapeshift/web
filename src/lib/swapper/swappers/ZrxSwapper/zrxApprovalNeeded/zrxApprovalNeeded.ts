import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ApprovalNeededInput, ApprovalNeededOutput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { getERC20Allowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function zrxApprovalNeeded<T extends ZrxSupportedChainId>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApprovalNeededInput<T>,
): Promise<ApprovalNeededOutput> {
  const { sellAsset } = quote

  const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

  try {
    if (sellAsset.chainId !== adapter.getChainId()) {
      throw new SwapError('[zrxApprovalNeeded] - sellAsset chainId is not supported', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId },
      })
    }

    // No approval needed for selling a fee asset
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return { approvalNeeded: false }
    }

    const { accountNumber } = quote

    const receiveAddress = await adapter.getAddress({ accountNumber, wallet })

    if (!quote.allowanceContract) {
      throw new SwapError('[zrxApprovalNeeded] - allowanceTarget is required', {
        code: SwapErrorType.VALIDATION_FAILED,
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

    if (!quote.feeData.chainSpecific?.gasPriceCryptoBaseUnit)
      throw new SwapError('[zrxApprovalNeeded] - no gas price with quote', {
        code: SwapErrorType.RESPONSE_ERROR,
        details: { feeData: quote.feeData },
      })
    return {
      approvalNeeded: allowanceOnChain.lt(bnOrZero(quote.sellAmountBeforeFeesCryptoBaseUnit)),
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApprovalNeeded]', {
      cause: e,
      code: SwapErrorType.CHECK_APPROVAL_FAILED,
    })
  }
}
