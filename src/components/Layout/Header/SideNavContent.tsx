import { ChatIcon, SunIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  FlexProps,
  HStack,
  Link,
  Stack,
  useColorMode,
  useColorModeValue,
  useMediaQuery
} from '@chakra-ui/react'
import { FaMoon } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Link as RouterLink } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { RawText, Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { MainNavLink } from './NavBar/MainNavLink'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  route: Route
  isCompact?: boolean
} & FlexProps

export const SideNavContent = ({ route, isCompact }: HeaderContentProps) => {
  const { toggleColorMode } = useColorMode()
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
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
      {!isLargerThanMd && (
        <>
          <Flex width='full'>
            <UserMenu />
          </Flex>
          <Box mt={12} width='full'>
            <AutoCompleteSearch />
          </Box>
        </>
      )}

      <NavBar isCompact={isCompact} mt={6} />
      <Stack width='full'>
        <MainNavLink
          variant='ghost'
          isCompact={isCompact}
          onClick={toggleColorMode}
          label={translate(isActive ? 'common.lightTheme' : 'common.darkTheme')}
          leftIcon={isActive ? <SunIcon /> : <FaMoon />}
        />
        <MainNavLink
          leftIcon={<ChatIcon />}
          isCompact={isCompact}
          as={Link}
          justifyContent='flex-start'
          variant='ghost'
          label={translate('common.submitFeedback')}
          isExternal
          href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
        />
        <HStack
          display={{ base: 'none', '2xl': 'flex' }}
          divider={<RawText mx={1}>•</RawText>}
          fontSize='sm'
          px={4}
          mt={4}
          color='gray.500'
        >
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
