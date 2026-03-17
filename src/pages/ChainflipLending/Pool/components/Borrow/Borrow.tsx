import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react'

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

const suspenseFallback = (
  <Flex minHeight='360px' alignItems='center' justifyContent='center'>
    <CircularProgress />
  </Flex>
)

type BorrowProps = {
  assetId: AssetId
}

export const Borrow = memo(({ assetId: initialAssetId }: BorrowProps) => {
  const [activeAssetId, setActiveAssetId] = useState(initialAssetId)
  const { connectedType } = useWallet().state
  const isNativeWallet = connectedType === KeyManager.Native
  const input = useMemo(
    () => ({ assetId: activeAssetId, isNativeWallet }),
    [activeAssetId, isNativeWallet],
  )

  return (
    <BorrowMachineCtx.Provider key={activeAssetId} options={{ input }}>
      <BorrowContent assetId={activeAssetId} onAssetChange={setActiveAssetId} />
    </BorrowMachineCtx.Provider>
  )
})

const BorrowContent = memo(
  ({ assetId, onAssetChange }: { assetId: AssetId; onAssetChange: (assetId: AssetId) => void }) => {
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
          {page === 'input' && <BorrowInput assetId={assetId} onAssetChange={onAssetChange} />}
          {(page === 'confirm' ||
            page === 'executing' ||
            page === 'success' ||
            page === 'error') && <BorrowConfirm assetId={assetId} />}
        </Suspense>
      </AnimatePresence>
    )
  },
)

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
