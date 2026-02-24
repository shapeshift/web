import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo } from 'react'

import { DepositMachineCtx } from './DepositMachineContext'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'

const DepositInput = lazy(() =>
  import('./DepositInput').then(({ DepositInput }) => ({ default: DepositInput })),
)
const DepositRefundAddress = lazy(() =>
  import('./DepositRefundAddress').then(({ DepositRefundAddress }) => ({
    default: DepositRefundAddress,
  })),
)
const DepositConfirm = lazy(() =>
  import('./DepositConfirm').then(({ DepositConfirm }) => ({ default: DepositConfirm })),
)

const suspenseFallback = <CircularProgress />

type DepositProps = {
  assetId: AssetId
}

export const Deposit = memo(({ assetId }: DepositProps) => {
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(() => ({ assetId, isNativeWallet }), [assetId, isNativeWallet])

  return (
    <DepositMachineCtx.Provider options={{ input }}>
      <DepositContent assetId={assetId} />
    </DepositMachineCtx.Provider>
  )
})

const DepositContent = memo(({ assetId }: { assetId: AssetId }) => {
  const isInput = DepositMachineCtx.useSelector(s => s.matches('input'))
  const isRefundAddress = DepositMachineCtx.useSelector(s => s.matches('refund_address_input'))
  const isExecuting = DepositMachineCtx.useSelector(s => s.hasTag('executing'))
  const isConfirm = DepositMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = DepositMachineCtx.useSelector(s => s.matches('success'))
  const isError = DepositMachineCtx.useSelector(s => s.matches('error'))

  useAccountStateSync()

  const page = useMemo(() => {
    if (isInput) return 'input' as const
    if (isRefundAddress) return 'refund_address_input' as const
    if (isConfirm) return 'confirm' as const
    if (isExecuting) return 'executing' as const
    if (isSuccess) return 'success' as const
    if (isError) return 'error' as const
    return 'input' as const
  }, [isInput, isRefundAddress, isConfirm, isExecuting, isSuccess, isError])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Suspense fallback={suspenseFallback}>
        {page === 'input' && <DepositInput assetId={assetId} />}
        {page === 'refund_address_input' && <DepositRefundAddress assetId={assetId} />}
        {(page === 'confirm' || page === 'executing' || page === 'success' || page === 'error') && (
          <DepositConfirm assetId={assetId} />
        )}
      </Suspense>
    </AnimatePresence>
  )
})

const useAccountStateSync = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const { isFunded, isLpRegistered, hasRefundAddress, isLoading } = useChainflipAccount()

  useEffect(() => {
    if (isLoading) return
    actorRef.send({
      type: 'SYNC_ACCOUNT_STATE',
      isFunded,
      isLpRegistered,
      hasRefundAddress,
    })
  }, [actorRef, isFunded, isLpRegistered, hasRefundAddress, isLoading])
}
