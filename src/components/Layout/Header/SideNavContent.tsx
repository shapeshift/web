import { ChatIcon, CloseIcon, SettingsIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Flex, IconButton, Stack, useMediaQuery } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { ChainMenu } from './NavBar/ChainMenu'
import { MainNavLink } from './NavBar/MainNavLink'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  isCompact?: boolean
  onClose?: () => void
} & FlexProps

export const SideNavContent = memo(({ isCompact, onClose }: HeaderContentProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const settings = useModal('settings')
  const feedbackSupport = useModal('feedbackSupport')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')

  const handleClickSettings = useCallback(() => {
    settings.open({})
    onClose && onClose()
  }, [onClose, settings])

  const handleClickSupport = useCallback(() => {
    feedbackSupport.open({})
    onClose && onClose()
  }, [onClose, feedbackSupport])

  const closeIcon = useMemo(() => <CloseIcon boxSize={3} />, [])
  const settingsIcon = useMemo(() => <SettingsIcon />, [])
  const chatIcon = useMemo(() => <ChatIcon />, [])

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
      paddingTop='calc(1.5rem + env(safe-area-inset-top))'
      p={4}
    >
      {!isLargerThanMd && (
        <Flex direction='column' rowGap={2} columnGap={2} width='full'>
          <IconButton
            ml='auto'
            aria-label='Close Nav'
            variant='ghost'
            icon={closeIcon}
            onClick={onClose}
          />
          <Flex gap={2}>
            <Flex width='full'>
              <UserMenu onClick={onClose} />
            </Flex>
            <ChainMenu />
          </Flex>
          {isWalletConnectToDappsV2Enabled && (
            <Box width='full'>
              <WalletConnectToDappsHeaderButton />
            </Box>
          )}
        </Flex>
      )}

      <NavBar isCompact={isCompact} mt={6} onClick={onClose} />
      <Stack width='full' mt={6} spacing={0}>
        <MainNavLink
          isCompact={isCompact}
          size='sm'
          onClick={handleClickSettings}
          label={translate('common.settings')}
          leftIcon={settingsIcon}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          isCompact={isCompact}
          size='sm'
          onClick={handleClickSupport}
          label={translate('common.feedbackAndSupport')}
          leftIcon={chatIcon}
        />
      </Stack>
    </Flex>
  )
})
