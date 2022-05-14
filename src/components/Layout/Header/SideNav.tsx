import { chakra, useColorModeValue } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SideNavContent } from './SideNavContent'

export const SideNav = () => {
  const bg = useColorModeValue('white', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const {
    state: { walletInfo },
  } = useWallet()
  const [top, setTop] = useState('4.5rem')
  useEffect(() => {
    setTop(walletInfo?.deviceId === 'DemoWallet' ? '7rem' : '4.5rem')
  }, [walletInfo?.deviceId])
  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        bg={bg}
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
