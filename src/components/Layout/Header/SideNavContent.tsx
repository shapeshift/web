import { ChatIcon, SunIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FlexProps,
  HStack,
  Link,
  Stack,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react'
import { FaMoon } from 'react-icons/fa'
import { Link as RouterLink } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { RawText, Text } from 'components/Text'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { BuySell } from './NavBar/BuySell'
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
      <Flex width='full' display={{ base: 'block', md: 'none' }}>
        <BuySell />
      </Flex>
      <Box mt={12} width='full' display={{ base: 'block', md: 'none' }}>
        <AutoCompleteSearch />
      </Box>
      <NavBar mt={6} />
      <Stack width='full'>
        <Button
          variant='ghost'
          isFullWidth
          onClick={toggleColorMode}
          justifyContent='space-between'
          leftIcon={isActive ? <SunIcon /> : <FaMoon />}
        >
          <Text mr='auto' translation={isActive ? 'common.lightTheme' : 'common.darkTheme'} />
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
        <HStack divider={<RawText mx={1}>•</RawText>} fontSize='sm' px={4} mt={4} color='gray.500'>
          <Link as={RouterLink} justifyContent='flex-start' to='/legal/terms-of-service'>
            <Text translation='common.terms' />
          </Link>
          <Link as={RouterLink} to='/legal/privacy-policy'>
            <Text translation='common.privacy' />
          </Link>
        </HStack>
      </Stack>
    </Flex>
  )
}
