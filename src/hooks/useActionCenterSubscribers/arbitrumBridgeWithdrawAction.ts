import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'

import type { ClaimDetails } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import { getArbitrumClaimableAt } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

export const getArbitrumBridgeWithdrawActionId = (withdrawTxHash: string): string =>
  `arbitrum-bridge-withdraw-${withdrawTxHash}`

// The outbox call is permissionless, so any of our ethereum accounts can pay for the claim
const getClaimDestinationAccountId = (
  destinationAddress: string,
  ethAccountIds: AccountId[],
): AccountId | undefined =>
  ethAccountIds.find(
    accountId =>
      fromAccountId(accountId).account.toLowerCase() === destinationAddress.toLowerCase(),
  ) ?? ethAccountIds[0]

export const buildArbitrumBridgeWithdrawActionFromClaim = (
  claim: ClaimDetails,
  ethAccountIds: AccountId[],
): ArbitrumBridgeWithdrawAction | undefined => {
  const destinationAccountId = getClaimDestinationAccountId(claim.destinationAddress, ethAccountIds)
  if (!destinationAccountId) return

  const createdAt = claim.withdrawTimeMs

  return {
    id: getArbitrumBridgeWithdrawActionId(claim.withdrawTxHash),
    type: ActionType.ArbitrumBridgeWithdraw,
    status:
      claim.status === ActionStatus.ClaimAvailable
        ? ActionStatus.ClaimAvailable
        : ActionStatus.Initiated,
    createdAt,
    updatedAt: createdAt,
    arbitrumBridgeMetadata: {
      withdrawTxHash: claim.withdrawTxHash,
      amountCryptoBaseUnit: claim.amountCryptoBaseUnit,
      assetId: claim.assetId,
      destinationAssetId: claim.destinationAssetId,
      accountId: claim.accountId,
      destinationAccountId,
      claimableAt: claim.claimableAt,
    },
  }
}

export const isArbitrumBridgeWithdrawSwap = (swap: Swap): boolean =>
  swap.swapperName === SwapperName.ArbitrumBridge && swap.buyAsset.chainId === ethChainId

export const buildArbitrumBridgeWithdrawActionFromSwap = (
  swap: Swap,
  withdrawTimeMs: number,
): ArbitrumBridgeWithdrawAction | undefined => {
  if (!isArbitrumBridgeWithdrawSwap(swap)) return
  if (!swap.sellTxHash || !swap.buyAccountId) return

  return {
    id: getArbitrumBridgeWithdrawActionId(swap.sellTxHash),
    type: ActionType.ArbitrumBridgeWithdraw,
    status: ActionStatus.Initiated,
    createdAt: withdrawTimeMs,
    updatedAt: withdrawTimeMs,
    arbitrumBridgeMetadata: {
      withdrawTxHash: swap.sellTxHash,
      amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
      assetId: swap.sellAsset.assetId,
      destinationAssetId: swap.buyAsset.assetId,
      accountId: swap.sellAccountId,
      destinationAccountId: swap.buyAccountId,
      claimableAt: getArbitrumClaimableAt(withdrawTimeMs),
    },
  }
}
