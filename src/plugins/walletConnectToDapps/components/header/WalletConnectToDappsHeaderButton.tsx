import { Button } from '@chakra-ui/react'
import type { FC } from 'react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'

import { WalletConnectModal } from '../modal/WalletConnectModal'

export const WalletConnectToDappsHeaderButton: FC = () => {
  const [isOpen, setOpen] = useState(false)
  const translate = useTranslate()
  return (
    <>
      <Button
        leftIcon={<WalletConnectIcon />}
        width='full'
        onClick={() => setOpen(true)}
        justifyContent={{ base: 'flex-start', md: 'center' }}
      >
        {translate('plugins.walletConnectToDapps.modal.title')}
      </Button>
      <WalletConnectModal isOpen={isOpen} onClose={() => setOpen(false)}>
        children
      </WalletConnectModal>
    </>
  )
}
