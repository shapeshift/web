import { lazy, Suspense, useMemo } from 'react'

import type { ChainflipLendingModalProps } from './types'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'

const Supply = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Supply/Supply').then(({ Supply }) => ({
    default: Supply,
  })),
)

const Withdraw = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Withdraw/Withdraw').then(({ Withdraw }) => ({
    default: Withdraw,
  })),
)

const Deposit = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Deposit/Deposit').then(({ Deposit }) => ({
    default: Deposit,
  })),
)

const Egress = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Egress/Egress').then(({ Egress }) => ({
    default: Egress,
  })),
)

const suspenseFallback = <CircularProgress />

const ChainflipLendingModalContent = ({ mode, assetId }: ChainflipLendingModalProps) => {
  const content = useMemo(() => {
    switch (mode) {
      case 'supply':
        return <Supply assetId={assetId} />
      case 'withdrawSupply':
        return <Withdraw assetId={assetId} />
      case 'deposit':
        return <Deposit assetId={assetId} />
      case 'withdrawFromChainflip':
        return <Egress assetId={assetId} />
      case 'addCollateral':
      case 'removeCollateral':
      case 'borrow':
      case 'repay':
      case 'voluntaryLiquidation':
        return null
      default:
        return null
    }
  }, [mode, assetId])

  return <Suspense fallback={suspenseFallback}>{content}</Suspense>
}

const ChainflipLendingModal = ({ mode, assetId }: ChainflipLendingModalProps) => {
  const { close, isOpen } = useModal('chainflipLending')

  return (
    <Dialog isOpen={isOpen} onClose={close}>
      <ChainflipLendingModalContent mode={mode} assetId={assetId} />
    </Dialog>
  )
}

export const ChainflipLendingModalComponent = ChainflipLendingModal
