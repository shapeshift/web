import { HamburgerIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Box,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { FiatRamps } from './NavBar/FiatRamps'
import { UserMenu } from './NavBar/UserMenu'
import { SideNavContent } from './SideNavContent'

export const Header = () => {
  const { onToggle, isOpen, onClose } = useDisclosure()
  const history = useHistory()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const {
    state: { walletInfo },
    dispatch,
  } = useWallet()

  /**
   * FOR DEVELOPERS:
   * Open the hidden flags menu via keypress
   */
  const handleKeyPress = useCallback(
    event => {
      if (event.altKey && event.shiftKey && event.keyCode === 70) {
        history.push('/flags')
      }
    },
    [history],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const handleBannerClick = () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <>
      <Flex
        direction='column'
        bg={bg}
        borderBottomWidth={1}
        borderColor={borderColor}
        width='full'
        position='sticky'
        zIndex='banner'
        top={0}
      >
        {walletInfo?.deviceId === 'DemoWallet' && (
          <Box
            bg='blue.500'
            width='full'
            height={{ base: '2.5rem', md: '3rem' }}
            fontSize={{ base: 'sm', md: 'md' }}
            as='button'
            onClick={handleBannerClick}
          >
            <HStack verticalAlign='middle' justifyContent='center' spacing={3}>
              <InfoIcon boxSize='1.3em' color='white' />
              <Text color='white' fontWeight='bold' translation='navBar.demoMode' />
              <Text color='white' fontWeight='medium' translation='navBar.clickToConnect' />
            </HStack>
          </Box>
        )}
        <HStack height='4.5rem' width='full' px={4}>
          <Box flex={1} display={{ base: 'block', md: 'none' }}>
            <IconButton
              aria-label='Open menu'
              variant='ghost'
              onClick={onToggle}
              icon={<HamburgerIcon />}
            />
          </Box>
          <Flex justifyContent={{ base: 'center', md: 'flex-start' }}>
            <Link to='/'>
              <FoxIcon boxSize='7' />
            </Link>
          </Flex>
          <HStack
            width='100%'
            flex={1}
            justifyContent='center'
            display={{ base: 'none', md: 'block' }}
          >
            <AutoCompleteSearch />
          </HStack>
          <Flex justifyContent='flex-end' flex={1}>
            <Box
              display={{ base: 'none', md: 'block' }}
              mr={{ base: 0, md: 4 }}
              mb={{ base: 4, md: 0 }}
            >
              <FiatRamps />
            </Box>
            <Box display={{ base: 'none', md: 'block' }}>
              <UserMenu />
            </Box>
          </Flex>
        </HStack>
      </Flex>
      <Drawer isOpen={isOpen} onClose={onClose} placement='left'>
        <DrawerOverlay />
        <DrawerContent>
          <SideNavContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
