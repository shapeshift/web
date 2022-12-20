import { KnownChainIds } from '@shapeshiftoss/types'

import { ApproveAmountInput, ApproveInfiniteInput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { grantAllowance } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
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
      code: SwapErrorTypes.APPROVE_INFINITE_FAILED,
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
      code: SwapErrorTypes.APPROVE_AMOUNT_FAILED,
    })
  }
}
