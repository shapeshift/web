import { fromAssetId } from '@shapeshiftoss/caip'
import type { ApproveAmountInput, ApproveInfiniteInput } from 'lib/swapper/api'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import { MAX_ALLOWANCE } from '../../utils/constants'

export function zrxApproveAmount<T extends ZrxSupportedChainId>(
  deps: ZrxSwapperDeps,
  { quote, wallet, amount }: ApproveAmountInput<T>,
): Promise<string> {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  return grantAllowance({
    ...deps,
    accountNumber,
    spender: allowanceContract,
    feeData: feeData.chainSpecific,
    approvalAmount: amount ?? quote.sellAmountBeforeFeesCryptoBaseUnit,
    to: fromAssetId(sellAsset.assetId).assetReference,
    wallet,
  })
}

export function zrxApproveInfinite<T extends ZrxSupportedChainId>(
  deps: ZrxSwapperDeps,
  input: ApproveInfiniteInput<T>,
): Promise<string> {
  return zrxApproveAmount(deps, { ...input, amount: MAX_ALLOWANCE })
}
