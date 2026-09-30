import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { describe, expect, it } from 'vitest'

import {
  buildArbitrumBridgeWithdrawActionFromClaim,
  buildArbitrumBridgeWithdrawActionFromSwap,
  getArbitrumBridgeWithdrawActionId,
} from './arbitrumBridgeWithdrawAction'

import type { ClaimDetails } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

const destinationAddress = '0xAbCdEf0000000000000000000000000000000001'
const otherEthAccountId = 'eip155:1:0x0000000000000000000000000000000000000002'
const destinationAccountId = `eip155:1:${destinationAddress.toLowerCase()}`

const claim = {
  withdrawTxHash: '0xwithdraw',
  withdrawTimeMs: 1_700_000_000_000,
  accountId: 'eip155:42161:0xarb',
  amountCryptoBaseUnit: '1000',
  assetId: 'eip155:42161/slip44:60',
  destinationAddress,
  destinationAssetId: ethAssetId,
  destinationChainId: ethChainId,
  status: ActionStatus.ClaimAvailable,
  claimableAt: 1_700_600_000_000,
} as unknown as ClaimDetails

const pendingClaim = { ...claim, status: ActionStatus.Initiated } as ClaimDetails

describe('buildArbitrumBridgeWithdrawActionFromClaim', () => {
  it('keys the action by the withdraw tx so every path lands on the same action', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(pendingClaim, [destinationAccountId])

    expect(action?.id).toBe(getArbitrumBridgeWithdrawActionId('0xwithdraw'))
    expect(action?.type).toBe(ActionType.ArbitrumBridgeWithdraw)
  })

  it('maps a pending claim to an initiated action dated from the withdraw block', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(pendingClaim, [destinationAccountId])

    expect(action?.status).toBe(ActionStatus.Initiated)
    expect(action?.createdAt).toBe(1_700_000_000_000)
    expect(action?.arbitrumBridgeMetadata).toMatchObject({
      withdrawTxHash: '0xwithdraw',
      amountCryptoBaseUnit: '1000',
      assetId: 'eip155:42161/slip44:60',
      destinationAssetId: ethAssetId,
      accountId: 'eip155:42161:0xarb',
      destinationAccountId,
      claimableAt: 1_700_600_000_000,
    })
  })

  it('maps an available claim to a claimable action', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, [destinationAccountId])

    expect(action?.status).toBe(ActionStatus.ClaimAvailable)
  })

  it('signs from the destination account when the wallet holds it, whatever its casing', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, [
      otherEthAccountId,
      destinationAccountId,
    ])

    expect(action?.arbitrumBridgeMetadata.destinationAccountId).toBe(destinationAccountId)
  })

  it('falls back to any ethereum account since the outbox call is permissionless', () => {
    const action = buildArbitrumBridgeWithdrawActionFromClaim(claim, [otherEthAccountId])

    expect(action?.arbitrumBridgeMetadata.destinationAccountId).toBe(otherEthAccountId)
  })

  it('builds nothing without an ethereum account to claim from', () => {
    expect(buildArbitrumBridgeWithdrawActionFromClaim(claim, [])).toBeUndefined()
  })
})

describe('buildArbitrumBridgeWithdrawActionFromSwap', () => {
  const swap = {
    swapperName: SwapperName.ArbitrumBridge,
    sellTxHash: '0xwithdraw',
    sellAccountId: 'eip155:42161:0xarb',
    buyAccountId: destinationAccountId,
    sellAmountCryptoBaseUnit: '1000',
    sellAsset: { assetId: 'eip155:42161/slip44:60' },
    buyAsset: { assetId: ethAssetId, chainId: ethChainId },
  } as unknown as Swap

  it('keys the action like the history rebuild and dates it from the withdraw', () => {
    const action = buildArbitrumBridgeWithdrawActionFromSwap(swap, 1_700_000_000_000)

    expect(action?.id).toBe(getArbitrumBridgeWithdrawActionId('0xwithdraw'))
    expect(action?.status).toBe(ActionStatus.Initiated)
    expect(action?.createdAt).toBe(1_700_000_000_000)
    expect(action?.arbitrumBridgeMetadata.destinationAccountId).toBe(destinationAccountId)
  })

  it('skips deposits and other swappers', () => {
    const deposit = { ...swap, buyAsset: { assetId: 'x', chainId: 'eip155:42161' } } as Swap
    const otherSwapper = { ...swap, swapperName: SwapperName.Thorchain } as Swap

    expect(buildArbitrumBridgeWithdrawActionFromSwap(deposit, 1)).toBeUndefined()
    expect(buildArbitrumBridgeWithdrawActionFromSwap(otherSwapper, 1)).toBeUndefined()
  })
})
