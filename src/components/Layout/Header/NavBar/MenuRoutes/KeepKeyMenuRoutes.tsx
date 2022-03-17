import { CloseIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route } from 'react-router-dom'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'
import {
  useMenuRoutes,
  WalletConnectedRoutes
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletImage } from 'components/Layout/Header/NavBar/UserMenu'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const KeepKeyMenuRoutes = () => {
  const { handleChangePinClick } = useMenuRoutes()
  const translate = useTranslate()
  const keepKey = useKeepKeyWallet()
  const { state } = useWallet()
  const { isConnected, walletInfo } = state

  function getBooleanLabel(value: boolean | undefined) {
    return value
      ? translate('walletProvider.keepKey.settings.status.enabled')
      : translate('walletProvider.keepKey.settings.status.disabled')
  }

  const keepKeyMenu = () => {
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

    const keepKeyStateLoaded = keepKey?.features && (
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
            value={translate('walletProvider.keepKey.settings.status.upToDate')}
            badge='v3.253'
            badgeColor='green'
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.firmware')}
            value={translate('walletProvider.keepKey.settings.status.updateAvailable')}
            badge='v6.04'
            badgeColor='yellow'
            hasSubmenu={true}
            valueDisposition='info'
          />
          <MenuDivider />
          <ExpandedMenuItem label='Label' value={walletInfo?.name} hasSubmenu={true} />
          <ExpandedMenuItem
            onClick={handleChangePinClick}
            label={translate('walletProvider.keepKey.settings.menuLabels.pin')}
            value='********'
            hasSubmenu={true}
          />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup title={'Advanced'} ml={3} color='gray.500'>
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.deviceTimeout')}
            value='10 Minutes'
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.pinCaching')}
            hasSubmenu={true}
            value={getBooleanLabel(keepKey.features.pinCached)}
            valueDisposition={keepKey.features.pinCached ? 'positive' : 'neutral'}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.passphrase')}
            value={getBooleanLabel(keepKey.features.passphraseProtection)}
            valueDisposition={keepKey.features.passphraseProtection ? 'positive' : 'neutral'}
            hasSubmenu={true}
          />
          <MenuDivider />
          <MenuItem color='red.500' icon={<CloseIcon />}>
            {translate('walletProvider.keepKey.settings.menuLabels.wipeDevice')}
          </MenuItem>
        </MenuGroup>
      </>
    )
    return keepKeyStateLoaded || keepKeyStateLoading
  }

  const changePin = () => {
    return (
      <Flex flexDir='column' ml={3} mr={3} mb={3}>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.devicePin')}
          description={translate('walletProvider.keepKey.settings.descriptions.pin')}
        />
        <Button colorScheme='blue' size='sm'>
          {translate('walletProvider.keepKey.settings.actions.updatePin')}
        </Button>
      </Flex>
    )
  }

  return (
    <>
      <Route exact path={WalletConnectedRoutes.KeepKey} component={keepKeyMenu} />
      <Route exact path={WalletConnectedRoutes.KeepKeyPin} component={changePin} />
    </>
  )
}
