import { Button } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'

import { WalletConnectModal } from '../modal/WalletConnectModal'

export const WalletConnectToDappsHeaderButton: FC = () => {
  const [isOpen, setOpen] = useState(false)
  const translate = useTranslate()
  const handleToggle = useCallback(() => setOpen(!isOpen), [isOpen])
  return (
    <>
      <Button
        leftIcon={<WalletConnectIcon />}
        width='full'
        onClick={handleToggle}
        justifyContent={{ base: 'flex-start', md: 'center' }}
      >
        {translate('plugins.walletConnectToDapps.modal.title')}
      </Button>
      <WalletConnectModal isOpen={isOpen} onClose={handleToggle}>
        children
      </WalletConnectModal>
    </>
  )
}
