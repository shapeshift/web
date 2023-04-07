import {
  ApproveAmountInput,
  ApproveInfiniteInput,
  SwapError,
  SwapErrorType,
  TradeQuote,
} from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { grantAllowance } from '../../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../types'
import { MAX_ALLOWANCE } from '../utils/constants'
import { ZrxSupportedChainId } from '../ZrxSwapper'

const grantAllowanceForAmount = async <T extends ZrxSupportedChainId>(
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
  return await grantAllowance<T>({
    quote: approvalQuote,
    wallet,
    adapter,
    erc20Abi,
    web3,
  })
}

export async function zrxApproveAmount<T extends ZrxSupportedChainId>(
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

export async function zrxApproveInfinite<T extends ZrxSupportedChainId>(
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
