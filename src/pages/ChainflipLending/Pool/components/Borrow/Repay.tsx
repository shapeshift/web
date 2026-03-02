import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { RepayMachineCtx } from './RepayMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'

const RepayInput = lazy(() =>
  import('./RepayInput').then(({ RepayInput }) => ({ default: RepayInput })),
)
const RepayConfirm = lazy(() =>
  import('./RepayConfirm').then(({ RepayConfirm }) => ({ default: RepayConfirm })),
)

const suspenseFallback = <CircularProgress />

type RepayProps = {
  assetId: AssetId
  loanId: number
}

export const Repay = memo(({ assetId, loanId }: RepayProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(
    () => ({ assetId, loanId, isNativeWallet }),
    [assetId, loanId, isNativeWallet],
  )

  return (
    <RepayMachineCtx.Provider options={{ input }}>
      <RepayContent assetId={assetId} loanId={loanId} />
    </RepayMachineCtx.Provider>
  )
})

type RepayContentProps = {
  assetId: AssetId
  loanId: number
}

const RepayContent = memo(({ assetId, loanId }: RepayContentProps) => {
  const isInput = RepayMachineCtx.useSelector(s => s.matches('input'))
  const isConfirm = RepayMachineCtx.useSelector(s => s.matches('confirm'))
  const isExecuting = RepayMachineCtx.useSelector(s => s.hasTag('executing'))
  const isSuccess = RepayMachineCtx.useSelector(s => s.matches('success'))
  const isError = RepayMachineCtx.useSelector(s => s.matches('error'))

  useFreeBalanceSync(assetId)
  useDebtSync(assetId, loanId)

  const page = useMemo(() => {
    if (isInput) return 'input' as const
    if (isConfirm) return 'confirm' as const
    if (isExecuting) return 'executing' as const
    if (isSuccess) return 'success' as const
    if (isError) return 'error' as const
    return 'input' as const
  }, [isInput, isConfirm, isExecuting, isSuccess, isError])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        {page === 'input' && <RepayInput assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <RepayConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useFreeBalanceSync = (assetId: AssetId) => {
  const actorRef = RepayMachineCtx.useActorRef()
  const { freeBalances } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoBaseUnit = useMemo(() => {
    if (!freeBalances || !cfAsset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return matching?.balance ?? '0'
  }, [freeBalances, cfAsset])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_FREE_BALANCE', freeBalanceCryptoBaseUnit })
  }, [actorRef, freeBalanceCryptoBaseUnit])
}

const useDebtSync = (assetId: AssetId, loanId: number) => {
  const actorRef = RepayMachineCtx.useActorRef()
  const { loansWithFiat } = useChainflipLoanAccount()

  const outstandingDebtCryptoBaseUnit = useMemo(() => {
    const matching = loansWithFiat.find(l => l.loanId === loanId && l.assetId === assetId)
    return matching?.principalAmountCryptoBaseUnit ?? '0'
  }, [loansWithFiat, loanId, assetId])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_DEBT', outstandingDebtCryptoBaseUnit })
  }, [actorRef, outstandingDebtCryptoBaseUnit])
}
