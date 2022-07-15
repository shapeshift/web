import { ApproveInfiniteInput, EvmSupportedChainIds, SwapError, SwapErrorTypes } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { grantAllowance } from '../../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../types'
import { MAX_ALLOWANCE } from '../utils/constants'

export async function zrxApproveInfinite<T extends EvmSupportedChainIds>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<T>
) {
  try {
    const approvalQuote = {
      ...quote,
      sellAmount: MAX_ALLOWANCE,
      feeData: {
        ...quote.feeData,
        chainSpecific: {
          ...quote.feeData.chainSpecific,
          // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
          // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
          estimatedGas: APPROVAL_GAS_LIMIT
        }
      }
    }
    const allowanceGrantRequired = await grantAllowance<T>({
      quote: approvalQuote,
      wallet,
      adapter,
      erc20Abi,
      web3
    })

    return allowanceGrantRequired
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveInfinite]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED
    })
  }
}
