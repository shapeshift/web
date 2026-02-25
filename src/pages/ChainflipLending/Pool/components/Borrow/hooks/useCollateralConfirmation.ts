import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { CollateralMachineCtx } from '../CollateralMachineContext'

import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

const POLL_INTERVAL_MS = 6_000
const TIMEOUT_MS = 5 * 60 * 1000

export const useCollateralConfirmation = () => {
  const actorRef = CollateralMachineCtx.useActorRef()
  const stateValue = CollateralMachineCtx.useSelector(s => s.value)
  const { assetId, collateralBalanceCryptoBaseUnit, mode } = CollateralMachineCtx.useSelector(
    s => ({
      assetId: s.context.assetId,
      collateralBalanceCryptoBaseUnit: s.context.collateralBalanceCryptoBaseUnit,
      mode: s.context.mode,
    }),
  )
  const { scAccount } = useChainflipLendingAccount()

  const isConfirming = stateValue === 'confirming'

  const { data: loanAccountsData } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: isConfirming && !!scAccount,
    refetchInterval: isConfirming ? POLL_INTERVAL_MS : false,
  })

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isConfirming) {
      timeoutRef.current = setTimeout(() => {
        actorRef.send({ type: 'COLLATERAL_TIMEOUT', error: 'Confirmation timed out' })
      }, TIMEOUT_MS)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isConfirming, actorRef])

  useEffect(() => {
    if (!isConfirming || !loanAccountsData || !cfAsset || !scAccount) return

    const loanAccount = loanAccountsData.find(account => account.account === scAccount)
    if (!loanAccount?.collateral) return

    const matchingCollateral = loanAccount.collateral.find(
      c => c.chain === cfAsset.chain && c.asset === cfAsset.asset,
    )

    if (!matchingCollateral?.amount) return

    try {
      const currentCollateralCryptoBaseUnit = BigInt(matchingCollateral.amount)
      const previousCollateralCryptoBaseUnit = BigInt(collateralBalanceCryptoBaseUnit || '0')

      const hasChanged =
        mode === 'add'
          ? currentCollateralCryptoBaseUnit > previousCollateralCryptoBaseUnit
          : currentCollateralCryptoBaseUnit < previousCollateralCryptoBaseUnit

      if (hasChanged) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        actorRef.send({ type: 'COLLATERAL_CONFIRMED' })
      }
    } catch {
      // keep polling
    }
  }, [
    isConfirming,
    loanAccountsData,
    cfAsset,
    scAccount,
    collateralBalanceCryptoBaseUnit,
    mode,
    actorRef,
  ])
}
