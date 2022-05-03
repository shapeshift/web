import { chakra, useColorModeValue } from '@chakra-ui/react'

import { SideNavContent } from './SideNavContent'

export const SideNav = () => {
  const bg = useColorModeValue('white', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        bg={bg}
        borderRightWidth={1}
        borderColor={borderColor}
        left='0'
        right='0'
        height='calc(100vh - 4.5rem)'
        position='sticky'
        top='4.5rem'
        maxWidth='xs'
        flex={{ base: 'inherit', '2xl': '1 1 0%' }}
        display={{ base: 'none', md: 'flex' }}
      >
        <SideNavContent isCompact={true} />
      </chakra.header>
    </>
  )
}
