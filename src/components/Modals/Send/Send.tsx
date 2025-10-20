import { useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { Form } from './Form'
import { desktopSendRoutes, mobileSendRoutes } from './SendCommon'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'
import { breakpoints } from '@/theme/theme'

export type SendModalProps = {
  assetId?: AssetId
  accountId?: AccountId
  input?: string
}

export const SendModal = ({ assetId, accountId, input }: SendModalProps) => {
  const { close, isOpen } = useModal('send')
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const initialEntries = useMemo(() => {
    return isSmallerThanMd ? mobileSendRoutes : desktopSendRoutes
  }, [isSmallerThanMd])

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={initialEntries}>
        <Form initialAssetId={assetId} accountId={accountId} input={input} />
      </MemoryRouter>
    </Dialog>
  )
}
