import { Center, chakra, Flex, useColorModeValue } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { useIsAnyApiFetching } from 'hooks/useIsAnyApiFetching/useIsAnyApiFetching'

import { SideNavContent } from './SideNavContent'

export const SideNav = () => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const isLoading = useIsAnyApiFetching()
  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        borderRightWidth={1}
        borderColor={borderColor}
        left='0'
        right='0'
        height={'100vh'}
        position='sticky'
        top={0}
        maxWidth='xs'
        flex={{ base: 'inherit', '2xl': '1 1 0%' }}
        display={{ base: 'none', md: 'flex' }}
        flexDir='column'
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
