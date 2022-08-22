import { chakra, useColorModeValue } from '@chakra-ui/react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SideNavContent } from './SideNavContent'

export const SideNav = () => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const {
    state: { isDemoWallet },
  } = useWallet()
  const top = isDemoWallet ? '7rem' : '4.5rem'
  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        borderRightWidth={1}
        borderColor={borderColor}
        left='0'
        right='0'
        height={`calc(100vh - ${top})`}
        position='sticky'
        top={top}
        maxWidth='xs'
        flex={{ base: 'inherit', '2xl': '1 1 0%' }}
        display={{ base: 'none', md: 'flex' }}
      >
        <SideNavContent isCompact={true} />
      </chakra.header>
    </>
  )
}
