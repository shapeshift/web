import { ChevronDownIcon, ChevronRightIcon, CloseIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Box, Button, Collapse, Flex, useDisclosure } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import {
  useMenuRoutes,
  WalletConnectedRoutes
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubMenuContainer } from 'components/Layout/Header/NavBar/SubMenuContainer'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { useKeepKeyVersions } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const KeepKeyMenu = () => {
  const { navigateToRoute } = useMenuRoutes()
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const {
    keepKeyWallet,
    state: { hasPinCaching, deviceTimeout }
  } = useKeepKey()
  const versions = useKeepKeyVersions()
  const {
    state: { isConnected, walletInfo }
  } = useWallet()
  const { keepKeyWipe } = useModal()

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
          <Flex ml={3}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              <Text
                ml={3}
                mr={3}
                translation='walletProvider.keepKey.settings.loadingText'
                fontSize='sm'
                color='yellow.500'
              />
            </Flex>
          </Flex>
        </MenuGroup>
      </>
    )

    const keepKeyStateLoaded = keepKeyWallet?.features && (
      <>
        <SubmenuHeader title={translate('common.connectedWalletSettings')} />
        <MenuGroup>
          <Flex ml={3}>
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
            label={translate('walletProvider.keepKey.settings.menuLabels.bootloader')}
            value={getUpdateText(versions?.bootloader.updateAvailable)}
            badge={versions?.bootloader.device}
            badgeColor={versions?.bootloader.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.bootloader.updateAvailable ? 'info' : 'neutral'}
            isDisabled={!versions?.bootloader.updateAvailable}
            externalUrl='https://beta.shapeshift.com/updater-download'
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.firmware')}
            value={getUpdateText(versions?.firmware.updateAvailable)}
            badge={versions?.firmware.device}
            badgeColor={versions?.firmware.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.firmware.updateAvailable ? 'info' : 'neutral'}
            isDisabled={!versions?.firmware.updateAvailable}
            externalUrl='https://beta.shapeshift.com/updater-download'
          />
          <MenuDivider />
          <ExpandedMenuItem
            onClick={() => navigateToRoute(WalletConnectedRoutes.KeepKeyLabel)}
            label='Label'
            value={walletInfo?.name}
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            onClick={() => navigateToRoute(WalletConnectedRoutes.KeepKeyPin)}
            label={translate('walletProvider.keepKey.settings.menuLabels.pin')}
            value='••••••'
            hasSubmenu={true}
          />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup>
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.advanced')}
            onClick={onToggle}
            isOpen={isOpen}
            closeOnSelect={false}
            hasSubmenu
          />
          <Collapse in={isOpen} animateOpacity>
            <Box>
              <ExpandedMenuItem
                onClick={() => navigateToRoute(WalletConnectedRoutes.KeepKeyTimeout)}
                label={translate('walletProvider.keepKey.settings.menuLabels.deviceTimeout')}
                value={deviceTimeoutTranslation}
                hasSubmenu={true}
              />
              <ExpandedMenuItem
                onClick={() => navigateToRoute(WalletConnectedRoutes.KeepKeyPinCaching)}
                label={translate('walletProvider.keepKey.settings.menuLabels.pinCaching')}
                hasSubmenu={true}
                value={getBooleanLabel(hasPinCaching)}
                valueDisposition={hasPinCaching ? 'positive' : 'neutral'}
              />
              <ExpandedMenuItem
                onClick={() => navigateToRoute(WalletConnectedRoutes.KeepKeyPassphrase)}
                label={translate('walletProvider.keepKey.settings.menuLabels.passphrase')}
                value={getBooleanLabel(keepKeyWallet.features.passphraseProtection)}
                valueDisposition={
                  keepKeyWallet.features.passphraseProtection ? 'positive' : 'neutral'
                }
                hasSubmenu={true}
              />
              <MenuDivider />
              <MenuItem onClick={handleWipeClick} color='red.500' icon={<CloseIcon />}>
                {translate('walletProvider.keepKey.settings.menuLabels.wipeDevice')}
              </MenuItem>
            </Box>
          </Collapse>
        </MenuGroup>
      </>
    )
    return keepKeyStateLoaded || keepKeyStateLoading
  }
  return (
    <SubMenuContainer>
      <RenderMenu />
    </SubMenuContainer>
  )
}
