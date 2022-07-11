import { ChatIcon, SettingsIcon } from '@chakra-ui/icons'
import { Box, Flex, FlexProps, Link, Stack, useMediaQuery } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { FiatRamps } from './NavBar/FiatRamps'
import { MainNavLink } from './NavBar/MainNavLink'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  isCompact?: boolean
  onClose?: () => void
} & FlexProps

export const SideNavContent = ({ isCompact, onClose }: HeaderContentProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { settings } = useModal()

  const handleClick = (onClick?: () => void) => {
    onClose && onClose()
    onClick && onClick()
  }

  return (
    <Flex
      width='full'
      height='full'
      alignItems='flex-start'
      justifyContent='flex-start'
      data-test='full-width-header'
      flexDir='column'
      paddingTop={`calc(1.5rem + env(safe-area-inset-top))`}
      p={4}
    >
      {!isLargerThanMd && (
        <>
          <Flex width='full'>
            <UserMenu onClick={() => handleClick()} />
          </Flex>
          <Flex width='full' mt={4}>
            <FiatRamps />
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
          onClick={() => handleClick(() => settings.open({}))}
          label={translate('common.settings')}
          leftIcon={<SettingsIcon />}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          leftIcon={<ChatIcon />}
          isCompact={isCompact}
          as={Link}
          justifyContent='flex-start'
          variant='ghost'
          onClick={() => handleClick()}
          label={translate('common.submitFeedback')}
          isExternal
          href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
        />
      </Stack>
    </Flex>
  )
}
