import { ChatIcon, CloseIcon, SettingsIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Flex, IconButton, Stack, useMediaQuery } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { useFeatureFlag } from '../../../hooks/useFeatureFlag/useFeatureFlag'
import { ChainMenu } from './NavBar/ChainMenu'
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
  const { settings, feedbackSupport } = useModal()
  const isWalletConnectToDappsV1Enabled = useFeatureFlag('WalletConnectToDapps')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const isWalletConnectToDappsEnabled =
    isWalletConnectToDappsV1Enabled || isWalletConnectToDappsV2Enabled

  const handleClick = useCallback(
    (onClick?: () => void) => {
      onClose && onClose()
      onClick && onClick()
    },
    [onClose],
  )

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
            variant='ghost'
            icon={<CloseIcon boxSize={3} />}
            onClick={() => handleClick()}
          />
          <Flex gap={2}>
            <Flex width='full'>
              <UserMenu onClick={() => handleClick()} />
            </Flex>
            <ChainMenu />
          </Flex>
          {isWalletConnectToDappsEnabled && (
            <Box width='full'>
              <WalletConnectToDappsHeaderButton />
            </Box>
          )}
        </Flex>
      )}

      <NavBar isCompact={isCompact} mt={6} onClick={() => handleClick()} />
      <Stack width='full' mt={6} spacing={0}>
        <MainNavLink
          isCompact={isCompact}
          size='sm'
          onClick={() => handleClick(() => settings.open({}))}
          label={translate('common.settings')}
          leftIcon={<SettingsIcon />}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          isCompact={isCompact}
          size='sm'
          onClick={() => handleClick(() => feedbackSupport.open({}))}
          label={translate('common.feedbackAndSupport')}
          leftIcon={<ChatIcon />}
        />
      </Stack>
    </Flex>
  )
}
