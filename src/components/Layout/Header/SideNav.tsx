import { Center, chakra, Flex, useColorModeValue } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { useIsAnyApiFetching } from 'hooks/useIsAnyApiFetching/useIsAnyApiFetching'

import { SideNavContent } from './SideNavContent'

export const SideNav = () => {
  const isLoading = useIsAnyApiFetching()
  const bgColor = useColorModeValue('white', 'blackAlpha.300')
  const shadow = useColorModeValue('lg', 'none')
  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        left='0'
        right='0'
        height={'100vh'}
        position='sticky'
        bg={bgColor}
        top={0}
        maxWidth='xs'
        flex={{ base: 'inherit', '2xl': '1 1 0%' }}
        display={{ base: 'none', md: 'flex' }}
        boxShadow={shadow}
        flexDir='column'
        zIndex='modal'
      >
        <Flex justifyContent={{ base: 'center', md: 'flex-start' }} pt={4} px={8}>
          <Link to='/'>
            <AnimatePresence exitBeforeEnter initial={true}>
              {isLoading ? (
                <SlideTransitionY key='loader'>
                  <Center boxSize='7'>
                    <CircularProgress size={7} />
                  </Center>
                </SlideTransitionY>
              ) : (
                <SlideTransitionY key='logo'>
                  <FoxIcon boxSize='7' />
                </SlideTransitionY>
              )}
            </AnimatePresence>
          </Link>
        </Flex>
        <SideNavContent isCompact={true} />
      </chakra.header>
    </>
  )
}
