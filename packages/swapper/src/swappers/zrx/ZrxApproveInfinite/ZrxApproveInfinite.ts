import { ApproveInfiniteInput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20Abi } from '../utils/abi/erc20-abi'
import { MAX_ALLOWANCE } from '../utils/constants'
import { grantAllowance } from '../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function ZrxApproveInfinite(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<'eip155:1'>
) {
  try {
    const allowanceGrantRequired = await grantAllowance({
      quote: {
        ...quote,
        sellAmount: MAX_ALLOWANCE
      },
      wallet,
      adapter,
      erc20Abi,
      web3
    })

    return allowanceGrantRequired
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[ZrxApproveInfinite]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED
    })
  }
}
