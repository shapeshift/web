import { HamburgerIcon } from '@chakra-ui/icons'
import {
  Box,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useHistory } from 'react-router'
import { Route } from 'Routes/helpers'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { UserMenu } from './NavBar/UserMenu'
import { SideNavContent } from './SideNavContent'

export const Header = ({ route }: { route: Route }) => {
  const { onToggle, isOpen, onClose } = useDisclosure()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const history = useHistory()
  const onClick = (asset: Asset) => {
    // CAIP19 has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = `/assets/${asset.caip19}`
    history.push(url)
  }
  return (
    <>
      <Flex
        height='4.5rem'
        bg={bg}
        borderBottomWidth={1}
        borderColor={borderColor}
        width='full'
        position='sticky'
        zIndex='banner'
        top={0}
      >
        <HStack width='full' px={4}>
          <Box flex={1} display={{ base: 'block', md: 'none' }}>
            <IconButton
              aria-label='Open menu'
              variant='ghost'
              onClick={onToggle}
              icon={<HamburgerIcon />}
            />
          </Box>
          <Flex justifyContent={{ base: 'center', md: 'flex-start' }}>
            <FoxIcon boxSize='7' />
          </Flex>
          <HStack
            width='100%'
            flex={1}
            justifyContent='center'
            display={{ base: 'none', md: 'block' }}
          >
            <AutoCompleteSearch onClick={onClick} />
          </HStack>
          <Flex justifyContent='flex-end' flex={1}>
            <Box display={{ base: 'none', md: 'block' }}>
              <UserMenu />
            </Box>
          </Flex>
        </HStack>
      </Flex>
      <Drawer isOpen={isOpen} onClose={onClose} placement='left'>
        <DrawerOverlay />
        <DrawerContent>{route && <SideNavContent route={route} />}</DrawerContent>
      </Drawer>
    </>
  )
}
