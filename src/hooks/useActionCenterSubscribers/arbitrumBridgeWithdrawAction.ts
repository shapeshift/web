import { ethChainId, toAccountId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'

import type { ClaimDetails } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import { getArbitrumClaimableAt } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

// Tx history keys withdraws by their lowercase txid, wallets don't promise a casing
export const getArbitrumBridgeWithdrawActionId = (withdrawTxHash: string): string =>
  `arbitrum-bridge-withdraw-${withdrawTxHash.toLowerCase()}`

export const buildArbitrumBridgeWithdrawActionFromClaim = (
  claim: ClaimDetails,
): ArbitrumBridgeWithdrawAction => {
  const destinationAccountId = toAccountId({
    chainId: claim.destinationChainId,
    account: claim.destinationAddress,
  })

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

  const withdrawTxHash = swap.sellTxHash.toLowerCase()

  return {
    id: getArbitrumBridgeWithdrawActionId(withdrawTxHash),
    type: ActionType.ArbitrumBridgeWithdraw,
    status: ActionStatus.Initiated,
    createdAt: withdrawTimeMs,
    updatedAt: withdrawTimeMs,
    arbitrumBridgeMetadata: {
      withdrawTxHash,
      amountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
      assetId: swap.sellAsset.assetId,
      destinationAssetId: swap.buyAsset.assetId,
      accountId: swap.sellAccountId,
      destinationAccountId: swap.buyAccountId,
      claimableAt: getArbitrumClaimableAt(withdrawTimeMs),
    },
  }
}
