import { Card } from '@chakra-ui/react'
import { lazy, Suspense, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { ChainflipLendingModalProps } from './types'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { ChainflipLendingAccountProvider } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'

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

const Collateral = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Borrow/Collateral').then(({ Collateral }) => ({
    default: Collateral,
  })),
)

const Borrow = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Borrow/Borrow').then(({ Borrow }) => ({
    default: Borrow,
  })),
)

const Repay = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Borrow/Repay').then(({ Repay }) => ({
    default: Repay,
  })),
)

const VoluntaryLiquidation = lazy(() =>
  import('@/pages/ChainflipLending/Pool/components/Borrow/VoluntaryLiquidation').then(
    ({ VoluntaryLiquidation }) => ({
      default: VoluntaryLiquidation,
    }),
  ),
)

const suspenseFallback = <CircularProgress />

const MODAL_TITLE_KEYS: Record<ChainflipLendingModalProps['mode'], string> = {
  supply: 'chainflipLending.supply.title',
  withdrawSupply: 'chainflipLending.withdraw.title',
  deposit: 'chainflipLending.depositToChainflip',
  withdrawFromChainflip: 'chainflipLending.egress.title',
  addCollateral: 'chainflipLending.collateral.title',
  removeCollateral: 'chainflipLending.collateral.title',
  borrow: 'chainflipLending.borrow.title',
  repay: 'chainflipLending.repay.title',
  voluntaryLiquidation: 'chainflipLending.manageLoan',
}

const ChainflipLendingModalContent = ({
  mode,
  assetId,
  loanId,
  liquidationAction,
  onClose,
}: ChainflipLendingModalProps & { onClose: () => void }) => {
  const translate = useTranslate()

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
        return <Collateral assetId={assetId} mode='add' />
      case 'removeCollateral':
        return <Collateral assetId={assetId} mode='remove' />
      case 'borrow':
        return <Borrow assetId={assetId} />
      case 'repay':
        return loanId !== undefined ? <Repay assetId={assetId} loanId={loanId} /> : null
      case 'voluntaryLiquidation':
        return <VoluntaryLiquidation action={liquidationAction ?? 'initiate'} onDone={onClose} />
      default:
        return null
    }
  }, [mode, assetId, loanId, liquidationAction, onClose])

  return (
    <>
      <DialogHeader>
        <DialogHeaderMiddle>
          <RawText fontWeight='bold'>{translate(MODAL_TITLE_KEYS[mode])}</RawText>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody p={0}>
        <Card variant='unstyled'>
          <Suspense fallback={suspenseFallback}>{content}</Suspense>
        </Card>
      </DialogBody>
    </>
  )
}

const ChainflipLendingModal = ({
  mode,
  assetId,
  loanId,
  liquidationAction,
}: ChainflipLendingModalProps) => {
  const { close, isOpen } = useModal('chainflipLending')

  return (
    <Dialog isOpen={isOpen} onClose={close}>
      <ChainflipLendingAccountProvider>
        <ChainflipLendingModalContent
          mode={mode}
          assetId={assetId}
          loanId={loanId}
          liquidationAction={liquidationAction}
          onClose={close}
        />
      </ChainflipLendingAccountProvider>
    </Dialog>
  )
}

export const ChainflipLendingModalComponent = ChainflipLendingModal
