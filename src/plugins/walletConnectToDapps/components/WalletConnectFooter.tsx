import { useColorModeValue } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { DialogFooter } from '@/components/Modal/components/DialogFooter'

const px = { base: 4, md: 6 }

export const WalletConnectFooter: React.FC<PropsWithChildren> = ({ children }) => {
  const boxShadow = useColorModeValue(
    '0 1px 1px 0 rgba(255,255,255,0.08) inset',
    '0 1px 1px 0 rgba(0,0,0,0.08) inset',
  )
  return (
    <DialogFooter
      bg='transparent'
      borderTopRadius='24px'
      pt={6}
      px={px}
      flexShrink={0}
      boxShadow={boxShadow}
    >
      {children}
    </DialogFooter>
  )
}
