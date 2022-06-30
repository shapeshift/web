import { ApproveInfiniteInput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { grantAllowance } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { MAX_ALLOWANCE } from '../utils/constants'

export async function cowApproveInfinite(
  { adapter, web3 }: CowSwapperDeps,
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
    throw new SwapError('[cowApproveInfinite]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED
    })
  }
}
