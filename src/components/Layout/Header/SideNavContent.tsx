import { ChatIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  FlexProps,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Stack,
  Switch,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react'
import { FaMoon } from 'react-icons/fa'
import { Route } from 'Routes/helpers'
import { Text } from 'components/Text'

import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  route: Route
} & FlexProps

export const SideNavContent = ({ route }: HeaderContentProps) => {
  const { toggleColorMode } = useColorMode()
  const isActive = useColorModeValue(false, true)
  return (
    <Flex
      width='full'
      height='full'
      alignItems='flex-start'
      justifyContent='flex-start'
      data-test='full-width-header'
      flexDir='column'
      p={4}
    >
      <Flex width='full' display={{ base: 'block', md: 'none' }}>
        <UserMenu />
      </Flex>
      <InputGroup mt={12} display={{ base: 'block', md: 'none' }}>
        <InputLeftElement>
          <SearchIcon color='gray.300' />
        </InputLeftElement>
        <Input placeholder='Search by token or address' variant='filled' />
      </InputGroup>
      <NavBar mt={6} />
      <Stack width='full'>
        <Button
          variant='ghost'
          isFullWidth
          onClick={toggleColorMode}
          justifyContent='space-between'
          leftIcon={<FaMoon />}
          rightIcon={<Switch isChecked={isActive} />}
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
  )
}
