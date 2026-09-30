import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'

import { ClaimStatus } from '@/components/ClaimRow/types'
import type { ClaimDetails } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
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
  claimStatus: ClaimStatus,
  ethAccountIds: AccountId[],
): ArbitrumBridgeWithdrawAction | undefined => {
  const destinationAccountId = getClaimDestinationAccountId(claim.destinationAddress, ethAccountIds)
  if (!destinationAccountId) return

  const createdAt = claim.tx.blockTime * 1000

  return {
    id: getArbitrumBridgeWithdrawActionId(claim.tx.txid),
    type: ActionType.ArbitrumBridgeWithdraw,
    status:
      claimStatus === ClaimStatus.Available ? ActionStatus.ClaimAvailable : ActionStatus.Initiated,
    createdAt,
    updatedAt: createdAt,
    arbitrumBridgeMetadata: {
      withdrawTxHash: claim.tx.txid,
      amountCryptoBaseUnit: claim.amountCryptoBaseUnit,
      assetId: claim.assetId,
      destinationAssetId: claim.destinationAssetId,
      accountId: claim.accountId,
      destinationAccountId,
      claimableAt: claim.claimableAt,
    },
  }
}
