import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { ApproveAmountInput, ApproveInfiniteInput } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'

export function cowApproveAmount(
  deps: CowSwapperDeps,
  { quote, wallet, amount }: ApproveAmountInput<KnownChainIds.EthereumMainnet>,
) {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  return grantAllowance({
    ...deps,
    accountNumber,
    approvalAmount: amount ?? quote.sellAmountBeforeFeesCryptoBaseUnit,
    to: fromAssetId(sellAsset.assetId).assetReference,
    feeData: feeData.chainSpecific,
    spender: allowanceContract,
    wallet,
  })
}

export function cowApproveInfinite(
  deps: CowSwapperDeps,
  input: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>,
): Promise<string> {
  return cowApproveAmount(deps, { ...input, amount: MAX_ALLOWANCE })
}
