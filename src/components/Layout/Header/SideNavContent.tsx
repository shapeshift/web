import { ChatIcon, CloseIcon, SettingsIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Flex, IconButton, Stack, useMediaQuery } from '@chakra-ui/react'
import { lazy, memo, Suspense, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { breakpoints } from 'theme/theme'

import { ChainMenu } from './NavBar/ChainMenu'
import { MainNavLink } from './NavBar/MainNavLink'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

const WalletConnectToDappsHeaderButton = lazy(() =>
  import('plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton').then(
    ({ WalletConnectToDappsHeaderButton }) => ({ default: WalletConnectToDappsHeaderButton }),
  ),
)

const spacing = { base: 6, md: 0 }

type HeaderContentProps = {
  isCompact?: boolean
  onClose?: () => void
} & FlexProps

const chatIcon = <ChatIcon />
const closeIcon = <CloseIcon />
const settingsIcon = <SettingsIcon />

export const SideNavContent = memo(({ isCompact, onClose }: HeaderContentProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
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

  const secondaryNavSize = useMemo(() => (isLargerThanMd ? 'sm' : 'lg'), [isLargerThanMd])

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
            aria-label={translate('navBar.closeNav')}
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
              <Suspense>
                <WalletConnectToDappsHeaderButton />
              </Suspense>
            </Box>
          )}
        </Flex>
      )}
      <NavBar isCompact={isCompact} mt={6} onClick={onClose} />
      <Stack width='full' mt={6} spacing={spacing}>
        <MainNavLink
          isCompact={isCompact}
          size={secondaryNavSize}
          onClick={handleClickSettings}
          label={translate('common.settings')}
          leftIcon={settingsIcon}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          isCompact={isCompact}
          size={secondaryNavSize}
          onClick={handleClickSupport}
          label={translate('common.feedbackAndSupport')}
          leftIcon={chatIcon}
        />
      </Stack>
    </Flex>
  )
})
