import { useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { desktopSendRoutes, mobileSendRoutes } from '../Send/SendCommon'
import { Form } from './Form'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

export type QrCodeModalProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const QrCodeModal = ({ assetId, accountId }: QrCodeModalProps) => {
  const { close, isOpen } = useModal('qrCode')
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const initialEntries = useMemo(() => {
    return isSmallerThanMd ? mobileSendRoutes : desktopSendRoutes
  }, [isSmallerThanMd])

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={initialEntries}>
        <Form assetId={assetId} accountId={accountId} />
      </MemoryRouter>
    </Dialog>
  )
}
