import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { ApproveAmountInput, ApproveInfiniteInput } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'

export function cowApproveInfinite(
  { adapter, web3 }: CowSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>,
): Promise<string> {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  return grantAllowance({
    accountNumber,
    approvalAmount: MAX_ALLOWANCE,
    to: fromAssetId(sellAsset.assetId).assetReference,
    feeData: feeData.chainSpecific,
    spender: allowanceContract,
    wallet,
    adapter,
    web3,
  })
}

export function cowApproveAmount(
  { adapter, web3 }: CowSwapperDeps,
  { quote, wallet, amount }: ApproveAmountInput<KnownChainIds.EthereumMainnet>,
) {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  return grantAllowance({
    accountNumber,
    approvalAmount: amount ?? quote.sellAmountBeforeFeesCryptoBaseUnit,
    to: fromAssetId(sellAsset.assetId).assetReference,
    feeData: feeData.chainSpecific,
    spender: allowanceContract,
    wallet,
    adapter,
    web3,
  })
}
