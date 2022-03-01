import { ChatIcon, SunIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FlexProps,
  Link,
  Stack,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FaMoon } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Route } from 'Routes/helpers'
import { Text } from 'components/Text'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  route: Route
} & FlexProps

export const SideNavContent = ({ route }: HeaderContentProps) => {
  const { toggleColorMode } = useColorMode()
  const isActive = useColorModeValue(false, true)
  const history = useHistory()
  const onClick = (asset: Asset) => {
    // CAIP19 has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = `/assets/${asset.caip19}`
    history.push(url)
  }
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
      <Box mt={12} width='full' display={{ base: 'block', md: 'none' }}>
        <AutoCompleteSearch onClick={onClick} />
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
      </Stack>
    </Flex>
  )
}
