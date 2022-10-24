import {
  ApproveAmountInput,
  ApproveInfiniteInput,
  EvmSupportedChainIds,
  SwapError,
  SwapErrorTypes,
} from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { grantAllowance } from '../../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../types'
import { MAX_ALLOWANCE } from '../utils/constants'

const grantAllowanceForAmount = async <T extends EvmSupportedChainIds>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<T>,
  approvalAmount: string,
) => {
  const approvalQuote = {
    ...quote,
    sellAmount: approvalAmount,
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

export async function zrxApproveAmount<T extends EvmSupportedChainIds>(
  deps: ZrxSwapperDeps,
  args: ApproveAmountInput<T>,
) {
  try {
    const sellAmount = args.quote.sellAmountCryptoPrecision
    // If no amount is specified we use the quotes sell amount
    const approvalAmount = args.amount ?? sellAmount
    return grantAllowanceForAmount(deps, args, approvalAmount)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveAmount]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_AMOUNT_FAILED,
    })
  }
}

export async function zrxApproveInfinite<T extends EvmSupportedChainIds>(
  deps: ZrxSwapperDeps,
  args: ApproveInfiniteInput<T>,
) {
  try {
    return grantAllowanceForAmount(deps, args, MAX_ALLOWANCE)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveInfinite]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED,
    })
  }
}
