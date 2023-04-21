import { fromAssetId } from '@shapeshiftoss/caip'
import type { ApproveAmountInput, ApproveInfiniteInput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

const grantAllowanceForAmount = <T extends ZrxSupportedChainId>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<T>,
  approvalAmount: string,
) => {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  return grantAllowance({
    accountNumber,
    spender: allowanceContract,
    feeData: feeData.chainSpecific,
    approvalAmount,
    to: fromAssetId(sellAsset.assetId).assetReference,
    wallet,
    adapter,
    web3,
  })
}

export function zrxApproveAmount<T extends ZrxSupportedChainId>(
  deps: ZrxSwapperDeps,
  args: ApproveAmountInput<T>,
): Promise<string> {
  try {
    // If no amount is specified we use the quotes sell amount
    const approvalAmount = args.amount ?? args.quote.sellAmountBeforeFeesCryptoBaseUnit
    return grantAllowanceForAmount(deps, args, approvalAmount)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveAmount]', {
      cause: e,
      code: SwapErrorType.APPROVE_AMOUNT_FAILED,
    })
  }
}

export function zrxApproveInfinite<T extends ZrxSupportedChainId>(
  deps: ZrxSwapperDeps,
  args: ApproveInfiniteInput<T>,
): Promise<string> {
  try {
    return grantAllowanceForAmount(deps, args, MAX_ALLOWANCE)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveInfinite]', {
      cause: e,
      code: SwapErrorType.APPROVE_INFINITE_FAILED,
    })
  }
}
