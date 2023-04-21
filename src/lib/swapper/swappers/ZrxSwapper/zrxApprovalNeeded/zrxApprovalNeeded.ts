import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ApprovalNeededInput, ApprovalNeededOutput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { getERC20Allowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import { assertValidTradePair } from '../utils/helpers/helpers'

export async function zrxApprovalNeeded<T extends ZrxSupportedChainId>(
  { adapter, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApprovalNeededInput<T>,
): Promise<ApprovalNeededOutput> {
  try {
    const { accountNumber, allowanceContract, buyAsset, sellAsset } = quote
    const sellAmount = quote.sellAmountBeforeFeesCryptoBaseUnit

    const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset })
    if (assertion.isErr()) {
      const { message, code, details } = assertion.unwrapErr()
      throw new SwapError(message, {
        code,
        details: details as Record<string, unknown> | undefined,
      })
    }

    // No approval needed for selling a fee asset
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return { approvalNeeded: false }
    }

    if (!allowanceContract) {
      throw new SwapError('[zrxApprovalNeeded] - quote contains no allowanceContract', {
        code: SwapErrorType.VALIDATION_FAILED,
        details: { quote },
      })
    }

    const receiveAddress = await adapter.getAddress({ accountNumber, wallet })

    const allowance = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      sellAssetErc20Address: fromAssetId(sellAsset.assetId).assetReference,
      spenderAddress: allowanceContract,
      ownerAddress: receiveAddress,
    })

    return {
      approvalNeeded: bnOrZero(allowance).lt(bnOrZero(sellAmount)),
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApprovalNeeded]', {
      cause: e,
      code: SwapErrorType.CHECK_APPROVAL_FAILED,
    })
  }
}
