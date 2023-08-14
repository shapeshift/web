import { chakra, Flex, useColorModeValue } from '@chakra-ui/react'
import { memo } from 'react'

import { AppLoadingIcon } from './AppLoadingIcon'
import { SideNavContent } from './SideNavContent'

export const SideNav = memo(() => {
  const bgColor = useColorModeValue('white', 'blackAlpha.300')
  const shadow = useColorModeValue('lg', 'none')
  return (
    <chakra.header
      paddingTop={`env(safe-area-inset-top)`}
      left='0'
      right='0'
      height={'100vh'}
      position='sticky'
      borderRightWidth={1}
      borderColor='border.base'
      bg={bgColor}
      top={0}
      width={{ base: 'auto', '2xl': 'xs' }}
      display={{ base: 'none', md: 'flex' }}
      boxShadow={shadow}
      flexDir='column'
      zIndex='modal'
      gridArea='left-sidebar'
    >
      <Flex justifyContent={{ base: 'center', md: 'flex-start' }} pt={4} px={8}>
        <AppLoadingIcon />
      </Flex>
      <SideNavContent isCompact={true} />
    </chakra.header>
  )
})
