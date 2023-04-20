import type { ApproveAmountInput, ApproveInfiniteInput, TradeQuote } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20Abi } from 'lib/swapper/swappers/utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

const grantAllowanceForAmount = <T extends ZrxSupportedChainId>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<T>,
  approvalAmount: string,
) => {
  const approvalQuote: TradeQuote<T> = {
    ...quote,
    sellAmountBeforeFeesCryptoBaseUnit: approvalAmount,
    feeData: {
      ...quote.feeData,
      chainSpecific: {
        ...quote.feeData.chainSpecific,
        // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
        // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
        estimatedGas: APPROVAL_GAS_LIMIT,
      },
    },
  }
  return grantAllowance<T>({
    quote: approvalQuote,
    wallet,
    adapter,
    erc20Abi,
    web3,
  })
}

export function zrxApproveAmount<T extends ZrxSupportedChainId>(
  deps: ZrxSwapperDeps,
  args: ApproveAmountInput<T>,
) {
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
) {
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
