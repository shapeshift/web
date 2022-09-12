import { ChatIcon, CloseIcon, SettingsIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Flex, IconButton, Link, Stack, useMediaQuery } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { DiscordIcon } from 'components/Icons/Discord'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { ChainMenu } from './NavBar/ChainMenu'
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
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { settings } = useModal()

  const handleClick = (onClick?: () => void) => {
    onClose && onClose()
    onClick && onClick()
  }

  return (
    <Flex
      width='full'
      height='auto'
      flex={1}
      alignItems='flex-start'
      justifyContent='flex-start'
      data-test='full-width-header'
      flexDir='column'
      overflowY='auto'
      paddingTop={`calc(1.5rem + env(safe-area-inset-top))`}
      p={4}
    >
      {!isLargerThanMd && (
        <Flex direction='column' rowGap={2} columnGap={2} width='full'>
          <IconButton
            ml='auto'
            aria-label='Close Nav'
            icon={<CloseIcon />}
            onClick={() => handleClick()}
          />
          <Flex width='full'>
            <ChainMenu />
          </Flex>
          <Flex width='full'>
            <UserMenu onClick={() => handleClick()} />
          </Flex>
          <Flex width='full'>
            <FiatRamps />
          </Flex>
          <Box width='full'>
            <AutoCompleteSearch />
          </Box>
        </Flex>
      )}

      <NavBar isCompact={isCompact} mt={6} onClick={() => handleClick()} />
      <Stack width='full' mt={6}>
        <MainNavLink
          variant='ghost'
          isCompact={isCompact}
          onClick={() => handleClick(() => settings.open({}))}
          label={translate('common.settings')}
          leftIcon={<SettingsIcon />}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          variant='ghost'
          isCompact={isCompact}
          as={Link}
          isExternal
          href='https://discord.gg/RQhAMsadpu' // unique link to attribute visitors, rather than discord.gg/shapeshift
          label={translate('common.joinDiscord')}
          leftIcon={<DiscordIcon />}
          data-test='navigation-join-discord-button'
        />
        <MainNavLink
          leftIcon={<ChatIcon />}
          isCompact={isCompact}
          as={Link}
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
