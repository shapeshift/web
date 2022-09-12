import { Button } from '@chakra-ui/react'
import type { FC } from 'react'
import { useState } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'

import { WalletConnectModal } from '../modal/WalletConnectModal'

export const WalletConnectToDappsHeaderButton: FC = () => {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <Button
        leftIcon={<WalletConnectIcon />}
        width='full'
        onClick={() => setOpen(true)}
        justifyContent={{ base: 'flex-start', md: 'center' }}
      >
        WC
      </Button>
      <WalletConnectModal isOpen={isOpen} onClose={() => setOpen(false)}>
        children
      </WalletConnectModal>
    </>
  )
}
