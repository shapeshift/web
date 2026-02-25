import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { WithdrawMachineCtx } from '../WithdrawMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import {
  queryLatestWithdrawalId,
  queryLiquidityWithdrawalStatus,
} from '@/lib/chainflip/explorerApi'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const FAST_POLL_INTERVAL_MS = 6_000
const FAST_MAX_POLL_ATTEMPTS = 20
const EGRESS_POLL_INTERVAL_MS = 60_000
const EGRESS_MAX_POLL_ATTEMPTS = 30

export const useWithdrawConfirmation = () => {
  const queryClient = useQueryClient()
  const actorRef = WithdrawMachineCtx.useActorRef()
  const stateValue = WithdrawMachineCtx.useSelector(s => s.value)
  const { assetId, supplyPositionCryptoBaseUnit, withdrawToWallet, withdrawAddress } =
    WithdrawMachineCtx.useSelector(s => ({
      assetId: s.context.assetId,
      supplyPositionCryptoBaseUnit: s.context.supplyPositionCryptoBaseUnit,
      withdrawToWallet: s.context.withdrawToWallet,
      withdrawAddress: s.context.withdrawAddress,
    }))
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'
  const pollCountRef = useRef(0)
  const supplyDecreasedRef = useRef(false)
  const [baselineId, setBaselineId] = useState<number | null>(null)

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const maxAttempts = useMemo(
    () =>
      withdrawToWallet ? FAST_MAX_POLL_ATTEMPTS + EGRESS_MAX_POLL_ATTEMPTS : FAST_MAX_POLL_ATTEMPTS,
    [withdrawToWallet],
  )

  useEffect(() => {
    if (!isConfirming || !withdrawToWallet || baselineId !== null) return
    if (!cfAsset || !withdrawAddress) return

    void queryLatestWithdrawalId(withdrawAddress, cfAsset.asset, cfAsset.chain).then(id => {
      setBaselineId(id)
    })
  }, [isConfirming, withdrawToWallet, baselineId, cfAsset, withdrawAddress])

  const { data: accountInfo } = useQuery({
    ...reactQueries.chainflipLending.accountInfo(scAccount ?? ''),
    enabled: isConfirming && !!scAccount && !supplyDecreasedRef.current,
    refetchInterval: isConfirming && !supplyDecreasedRef.current ? FAST_POLL_INTERVAL_MS : false,
  })

  const { data: withdrawalStatus } = useQuery({
    queryKey: [
      'chainflipWithdrawEgressStatus',
      withdrawAddress,
      cfAsset?.asset,
      cfAsset?.chain,
      baselineId,
    ],
    queryFn: () => {
      if (!cfAsset || !withdrawAddress || baselineId === null) return null
      return queryLiquidityWithdrawalStatus(
        withdrawAddress,
        cfAsset.asset,
        cfAsset.chain,
        baselineId,
      )
    },
    enabled:
      isConfirming &&
      withdrawToWallet &&
      supplyDecreasedRef.current &&
      !!cfAsset &&
      !!withdrawAddress &&
      baselineId !== null,
    refetchInterval:
      isConfirming && withdrawToWallet && supplyDecreasedRef.current
        ? EGRESS_POLL_INTERVAL_MS
        : false,
  })

  const invalidateQueries = useCallback(async () => {
    if (!scAccount) return
    await Promise.all([
      queryClient.invalidateQueries(reactQueries.chainflipLending.freeBalances(scAccount)),
      queryClient.invalidateQueries(reactQueries.chainflipLending.accountInfo(scAccount)),
    ])
  }, [queryClient, scAccount])

  useEffect(() => {
    if (stateValue === 'input') {
      pollCountRef.current = 0
      supplyDecreasedRef.current = false
      setBaselineId(null)
      queryClient.removeQueries({ queryKey: ['chainflipWithdrawEgressStatus'] })
    }
  }, [stateValue, queryClient])

  useEffect(() => {
    if (!isConfirming) return

    pollCountRef.current += 1
    if (pollCountRef.current > maxAttempts) {
      actorRef.send({ type: 'WITHDRAW_TIMEOUT', error: 'Confirmation timed out' })
      return
    }

    if (!supplyDecreasedRef.current && accountInfo?.lending_positions && cfAsset) {
      const matchingPosition = accountInfo.lending_positions.find(
        p => p.chain === cfAsset.chain && p.asset === cfAsset.asset,
      )

      const currentPositionCryptoBaseUnit = (() => {
        if (!matchingPosition?.total_amount) return 0n
        try {
          return BigInt(matchingPosition.total_amount)
        } catch {
          return 0n
        }
      })()

      const previousPositionCryptoBaseUnit = (() => {
        try {
          return BigInt(supplyPositionCryptoBaseUnit || '0')
        } catch {
          return 0n
        }
      })()

      if (currentPositionCryptoBaseUnit < previousPositionCryptoBaseUnit) {
        if (!withdrawToWallet) {
          void invalidateQueries()
          actorRef.send({ type: 'WITHDRAW_CONFIRMED' })
          return
        }
        supplyDecreasedRef.current = true
      }
    }

    if (withdrawToWallet && supplyDecreasedRef.current && withdrawalStatus) {
      if (withdrawalStatus.broadcastComplete && withdrawalStatus.transactionRef) {
        void invalidateQueries()
        actorRef.send({
          type: 'WITHDRAW_CONFIRMED',
          egressTxRef: withdrawalStatus.transactionRef,
        })
      }
    }
  }, [
    isConfirming,
    accountInfo,
    cfAsset,
    supplyPositionCryptoBaseUnit,
    withdrawToWallet,
    withdrawalStatus,
    actorRef,
    invalidateQueries,
    maxAttempts,
  ])
}
