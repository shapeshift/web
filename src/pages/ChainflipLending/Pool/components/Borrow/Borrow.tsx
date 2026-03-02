import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { BorrowMachineCtx } from './BorrowMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'

const BorrowInput = lazy(() =>
  import('./BorrowInput').then(({ BorrowInput }) => ({ default: BorrowInput })),
)
const BorrowConfirm = lazy(() =>
  import('./BorrowConfirm').then(({ BorrowConfirm }) => ({ default: BorrowConfirm })),
)

const suspenseFallback = <CircularProgress />

type BorrowProps = {
  assetId: AssetId
}

export const Borrow = memo(({ assetId }: BorrowProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ assetId, isNativeWallet }), [assetId, isNativeWallet])

  return (
    <BorrowMachineCtx.Provider options={{ input }}>
      <BorrowContent assetId={assetId} />
    </BorrowMachineCtx.Provider>
  )
})

const BorrowContent = memo(({ assetId }: { assetId: AssetId }) => {
  const isInput = BorrowMachineCtx.useSelector(s => s.matches('input'))
  const isConfirm = BorrowMachineCtx.useSelector(s => s.matches('confirm'))
  const isExecuting = BorrowMachineCtx.useSelector(s => s.hasTag('executing'))
  const isSuccess = BorrowMachineCtx.useSelector(s => s.matches('success'))
  const isError = BorrowMachineCtx.useSelector(s => s.matches('error'))

  useLtvSync()

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
        {page === 'input' && <BorrowInput assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <BorrowConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useLtvSync = () => {
  const actorRef = BorrowMachineCtx.useActorRef()
  const stateValue = BorrowMachineCtx.useSelector(s => s.value)
  const { loanAccount } = useChainflipLoanAccount()

  const currentLtvBps = useMemo(() => {
    if (!loanAccount?.ltv_ratio) return 0
    try {
      const rawPerbill = Number(BigInt(loanAccount.ltv_ratio))
      return Math.round(rawPerbill / 100000)
    } catch {
      return 0
    }
  }, [loanAccount?.ltv_ratio])

  useEffect(() => {
    actorRef.send({ type: 'SYNC_LTV', currentLtvBps })
  }, [actorRef, currentLtvBps, stateValue])
}
