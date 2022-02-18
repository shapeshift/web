import { ChatIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Portal,
  Stack,
  Switch,
  useColorModeValue
} from '@chakra-ui/react'
import { FaMoon } from 'react-icons/fa'
import { Route } from 'Routes/helpers'
import { Text } from 'components/Text'

import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

export const HeaderContent = ({ route }: { route: Route }) => {
  const navbarBg = useColorModeValue('white', 'gray.800')
  const navbarBorder = useColorModeValue('gray.100', 'gray.750')
  const navShadow = useColorModeValue('lg', 'dark-lg')
  return (
    <>
      <Flex
        width='full'
        height='full'
        alignItems='flex-start'
        justifyContent='flex-start'
        data-test='full-width-header'
        flexDir='column'
        p={4}
      >
        <Flex width='full'>
          <UserMenu />
        </Flex>
        <InputGroup mt={12}>
          <InputLeftElement>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input placeholder='Search by token or address' variant='filled' />
        </InputGroup>
        <NavBar display={{ base: 'none', md: 'flex' }} mt={6} />
        <Stack width='full'>
          <Button
            variant='ghost'
            isFullWidth
            justifyContent='space-between'
            leftIcon={<FaMoon />}
            rightIcon={<Switch isChecked={true} />}
          >
            <Text mr='auto' translation='common.darkMode' />
          </Button>
          <Button
            leftIcon={<ChatIcon />}
            as={Link}
            justifyContent='flex-start'
            variant='ghost'
            isExternal
            href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
          >
            <Text translation='common.submitFeedback' />
          </Button>
        </Stack>
      </Flex>
      <Portal>
        <Box
          position='fixed'
          width='full'
          display={{ base: 'inline-block', md: 'none' }}
          bottom={0}
          pb={'env(safe-area-inset-bottom)'}
          left='50%'
          transform='translateX(-50%)'
          bg={navbarBg}
          borderTopWidth={1}
          borderColor={navbarBorder}
          boxShadow={navShadow}
        >
          <Stack as={'nav'} spacing={4} p={2}>
            <NavBar />
          </Stack>
        </Box>
      </Portal>
    </>
  )
}
