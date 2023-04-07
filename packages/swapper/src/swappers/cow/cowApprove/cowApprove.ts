import type { KnownChainIds } from '@shapeshiftoss/types'

import type { ApproveAmountInput, ApproveInfiniteInput } from '../../../api'
import { SwapError, SwapErrorType } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { grantAllowance } from '../../utils/helpers/helpers'
import type { CowSwapperDeps } from '../CowSwapper'
import { MAX_ALLOWANCE } from '../utils/constants'

export async function cowApproveInfinite(
  { adapter, web3 }: CowSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>,
) {
  try {
    const allowanceGrantRequired = await grantAllowance<KnownChainIds.EthereumMainnet>({
      quote: {
        ...quote,
        sellAmountBeforeFeesCryptoBaseUnit: MAX_ALLOWANCE,
      },
      wallet,
      adapter,
      erc20Abi,
      web3,
    })

    return allowanceGrantRequired
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowApproveInfinite]', {
      cause: e,
      code: SwapErrorType.APPROVE_INFINITE_FAILED,
    })
  }
}

export async function cowApproveAmount(
  { adapter, web3 }: CowSwapperDeps,
  { quote, wallet, amount }: ApproveAmountInput<KnownChainIds.EthereumMainnet>,
) {
  try {
    const approvalAmount = amount ?? quote.sellAmountBeforeFeesCryptoBaseUnit
    const allowanceGrantRequired = await grantAllowance<KnownChainIds.EthereumMainnet>({
      quote: {
        ...quote,
        sellAmountBeforeFeesCryptoBaseUnit: approvalAmount,
      },
      wallet,
      adapter,
      erc20Abi,
      web3,
    })

    return allowanceGrantRequired
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowApproveAmount]', {
      cause: e,
      code: SwapErrorType.APPROVE_AMOUNT_FAILED,
    })
  }
}
