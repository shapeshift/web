import { ApproveInfiniteInput, EvmSupportedChainIds, SwapError, SwapErrorTypes } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { grantAllowance } from '../../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../types'
import { MAX_ALLOWANCE } from '../utils/constants'

export async function zrxApproveInfinite<T extends EvmSupportedChainIds>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<T>
) {
  try {
    const allowanceGrantRequired = await grantAllowance<T>({
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
    throw new SwapError('[zrxApproveInfinite]', {
      cause: e,
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED
    })
  }
}
