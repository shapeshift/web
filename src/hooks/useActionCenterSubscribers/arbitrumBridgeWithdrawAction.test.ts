import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import {
  buildArbitrumBridgeWithdrawActionFromClaim,
  getArbitrumBridgeWithdrawActionId,
} from './arbitrumBridgeWithdrawAction'

import { ClaimStatus } from '@/components/ClaimRow/types'
import type { ClaimDetails } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

const destinationAddress = '0xAbCdEf0000000000000000000000000000000001'
const otherEthAccountId = 'eip155:1:0x0000000000000000000000000000000000000002'
const destinationAccountId = `eip155:1:${destinationAddress.toLowerCase()}`

const claim = {
  tx: { txid: '0xwithdraw', blockTime: 1_700_000_000 },
  accountId: 'eip155:42161:0xarb',
  amountCryptoBaseUnit: '1000',
  assetId: 'eip155:42161/slip44:60',
  destinationAddress,
  destinationAssetId: ethAssetId,
  destinationChainId: ethChainId,
  timeRemainingSeconds: 120,
} as unknown as ClaimDetails

describe('buildArbitrumBridgeWithdrawActionFromClaim', () => {
  it('keys the action by the withdraw tx so every path lands on the same action', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Pending, [
      destinationAccountId,
    ])

    expect(action?.id).toBe(getArbitrumBridgeWithdrawActionId('0xwithdraw'))
    expect(action?.type).toBe(ActionType.ArbitrumBridgeWithdraw)
  })

  it('maps a pending claim to an initiated action dated from the withdraw block', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Pending, [
      destinationAccountId,
    ])

    expect(action?.status).toBe(ActionStatus.Initiated)
    expect(action?.createdAt).toBe(1_700_000_000_000)
    expect(action?.arbitrumBridgeMetadata).toMatchObject({
      withdrawTxHash: '0xwithdraw',
      amountCryptoBaseUnit: '1000',
      assetId: 'eip155:42161/slip44:60',
      destinationAssetId: ethAssetId,
      accountId: 'eip155:42161:0xarb',
      destinationAccountId,
      timeRemainingSeconds: 120,
      claimDetails: claim,
    })
  })

  it('maps an available claim to a claimable action', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Available, [
      destinationAccountId,
    ])

    expect(action?.status).toBe(ActionStatus.ClaimAvailable)
  })

  it('signs from the destination account when the wallet holds it, whatever its casing', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Available, [
      otherEthAccountId,
      destinationAccountId,
    ])

    expect(action?.arbitrumBridgeMetadata.destinationAccountId).toBe(destinationAccountId)
  })

  it('falls back to any ethereum account since the outbox call is permissionless', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Available, [
      otherEthAccountId,
    ])

    expect(action?.arbitrumBridgeMetadata.destinationAccountId).toBe(otherEthAccountId)
  })

  it('builds nothing without an ethereum account to claim from', () => {
    expect(
      buildArbitrumBridgeWithdrawActionFromClaim(claim, ClaimStatus.Available, []),
    ).toBeUndefined()
  })
})
