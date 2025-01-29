import { CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  Collapse,
  Flex,
  MenuDivider,
  MenuGroup,
  MenuItem,
  useDisclosure,
} from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import {
  useMenuRoutes,
  WalletConnectedRoutes,
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubMenuContainer } from 'components/Layout/Header/NavBar/SubMenuContainer'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { useKeepKeyVersions } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

const closeIcon = <CloseIcon />

export const KeepKeyMenu = () => {
  const { navigateToRoute } = useMenuRoutes()
  const navigateToKeepKeyLabel = useCallback(
    () => navigateToRoute(WalletConnectedRoutes.KeepKeyLabel),
    [navigateToRoute],
  )
  const navigateToKeepkeyPin = useCallback(
    () => navigateToRoute(WalletConnectedRoutes.KeepKeyPin),
    [navigateToRoute],
  )
  const navigateToKeepkeyTimeout = useCallback(
    () => navigateToRoute(WalletConnectedRoutes.KeepKeyTimeout),
    [navigateToRoute],
  )
  const navigateToKeepkeyPassphrase = useCallback(
    () => navigateToRoute(WalletConnectedRoutes.KeepKeyPassphrase),
    [navigateToRoute],
  )

  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const {
    state: { deviceTimeout, features },
  } = useKeepKey()
  const { versions, updaterUrl } = useKeepKeyVersions()
  const {
    setDeviceState,
    state: { isConnected, walletInfo },
  } = useWallet()
  const keepKeyWipe = useModal('keepKeyWipe')

  // Reset ephemeral device state properties when opening the KeepKey menu
  useEffect(() => {
    setDeviceState({
      lastDeviceInteractionStatus: undefined,
      awaitingDeviceInteraction: false,
    })
  }, [setDeviceState])

  const getBooleanLabel = (value: boolean | undefined) => {
    return value
      ? translate('walletProvider.keepKey.settings.status.enabled')
      : translate('walletProvider.keepKey.settings.status.disabled')
  }

  const getUpdateText = (updateAvailable: boolean | undefined) => {
    return updateAvailable
      ? translate('walletProvider.keepKey.settings.status.updateAvailable')
      : translate('walletProvider.keepKey.settings.status.upToDate')
  }

  const handleWipeClick = () => {
    keepKeyWipe.open({})
  }

  const deviceTimeoutTranslation: string =
    typeof deviceTimeout?.label === 'object'
      ? translate(...deviceTimeout?.label)
      : translate(deviceTimeout?.label)

  const RenderMenu = () => {
    const keepKeyStateLoading = (
      <>
        <SubmenuHeader title={translate('common.connectedWalletSettings')} />
        <MenuGroup>
          <Flex px={4} py={2}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              <Text
                ml={3}
                mr={3}
                translation='common.loadingText'
                fontSize='sm'
                color='yellow.500'
              />
            </Flex>
          </Flex>
        </MenuGroup>
      </>
    )

    const keepKeyStateLoaded = (
      <>
        <SubmenuHeader title={translate('common.connectedWalletSettings')} />
        <MenuGroup>
          <Flex px={4} py={2}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              {!isConnected && (
                <Text
                  mr={3}
                  translation={'connectWallet.menu.disconnected'}
                  fontSize='sm'
                  color='yellow.500'
                />
              )}
            </Flex>
          </Flex>
          <MenuDivider />
          <ExpandedMenuItem
            label='walletProvider.keepKey.settings.menuLabels.bootloader'
            value={getUpdateText(versions?.bootloader.updateAvailable)}
            badge={versions?.bootloader.device ?? 'Loading'}
            badgeColor={versions?.bootloader.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.bootloader.updateAvailable ? 'info' : 'neutral'}
            isDisabled={!versions?.bootloader.updateAvailable}
            externalUrl={updaterUrl}
          />
          <ExpandedMenuItem
            label='walletProvider.keepKey.settings.menuLabels.firmware'
            value={getUpdateText(versions?.firmware.updateAvailable)}
            badge={versions?.firmware.device ?? 'Loading'}
            badgeColor={versions?.firmware.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.firmware.updateAvailable ? 'info' : 'neutral'}
            isDisabled={!versions?.firmware.updateAvailable}
            externalUrl={updaterUrl}
          />
          <MenuDivider />
          <ExpandedMenuItem
            onClick={navigateToKeepKeyLabel}
            label='walletProvider.keepKey.settings.menuLabels.label'
            value={walletInfo?.meta?.label ?? walletInfo?.name}
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            onClick={navigateToKeepkeyPin}
            label='walletProvider.keepKey.settings.menuLabels.pin'
            value='••••••'
            hasSubmenu={true}
          />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup>
          <ExpandedMenuItem
            label='walletProvider.keepKey.settings.menuLabels.advanced'
            onClick={onToggle}
            isOpen={isOpen}
            closeOnSelect={false}
            hasSubmenu
          />
          <Collapse in={isOpen}>
            <Box ml={3}>
              <ExpandedMenuItem
                onClick={navigateToKeepkeyTimeout}
                label='walletProvider.keepKey.settings.menuLabels.deviceTimeout'
                value={deviceTimeoutTranslation}
                hasSubmenu={true}
              />
              <ExpandedMenuItem
                onClick={navigateToKeepkeyPassphrase}
                label='walletProvider.keepKey.settings.menuLabels.passphrase'
                value={getBooleanLabel(features?.passphraseProtection)}
                valueDisposition={features?.passphraseProtection ? 'positive' : 'neutral'}
                hasSubmenu={true}
              />
              <MenuDivider />
              <MenuItem onClick={handleWipeClick} color='red.500' icon={closeIcon}>
                {translate('walletProvider.keepKey.settings.menuLabels.wipeDevice')}
              </MenuItem>
            </Box>
          </Collapse>
        </MenuGroup>
      </>
    )
    return features ? keepKeyStateLoaded : keepKeyStateLoading
  }
  return (
    <SubMenuContainer>
      <RenderMenu />
    </SubMenuContainer>
  )
}
