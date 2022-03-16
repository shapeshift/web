import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Button,Flex } from '@chakra-ui/react'
import { Features } from '@keepkey/device-protocol/lib/messages_pb'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey/dist/keepkey'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletConnectedProps, WalletImage } from 'components/Layout/Header/NavBar/UserMenu'
import { RawText, Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/config'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export enum WalletConnectedRoutes {
  Connected = '/connected',
  KeepKey = '/connected/keepkey',
  KeepKeyPin = '/connected/keepkey/pin'
}

export const WalletConnectedMenuRoutes = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  type
}: WalletConnectedProps) => {
  const { handleKeepKeyClick, handleChangePinClick } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const [walletFeatures, setWalletFeatures] = useState<Features.AsObject>()
  const [keepKeyWallet, setKeepKeyWallet] = useState<KeepKeyHDWallet | undefined>()
  const { state: walletState } = useWallet()
  const isKeepKey = type === KeyManager.KeepKey
  const wallet = walletState.wallet

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const features = (await wallet.getFeatures()) as Features.AsObject
      setWalletFeatures(features)
      isKeepKey && setKeepKeyWallet(wallet as KeepKeyHDWallet)
      // await keepKeyWallet?.applySettings({ label: 'Test KeepKey' })
    })()
  }, [isKeepKey, wallet])

  const connectedMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
        <MenuItem
          closeOnSelect={!isKeepKey}
          onClick={isKeepKey ? handleKeepKeyClick : undefined}
          icon={<WalletImage walletInfo={walletInfo} />}
        >
          <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
            <RawText>{walletInfo?.name}</RawText>
            {!isConnected && (
              <Text
                translation={'connectWallet.menu.disconnected'}
                fontSize='sm'
                color='yellow.500'
              />
            )}
            {isKeepKey && <ChevronRightIcon />}
          </Flex>
        </MenuItem>
        <MenuDivider ml={3} />
        <MenuItem icon={<RepeatIcon />} onClick={onSwitchProvider}>
          {translate('connectWallet.menu.switchWallet')}
        </MenuItem>
        <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={onDisconnect} color='red.500'>
          {translate('connectWallet.menu.disconnect')}
        </MenuItem>
      </MenuGroup>
    )
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

    const keepKeyStateLoaded = walletFeatures && (
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
            value={
              walletFeatures.pinCached
                ? translate('walletProvider.keepKey.settings.status.enabled')
                : translate('walletProvider.keepKey.settings.status.disabled')
            }
            valueDisposition={walletFeatures.pinCached ? 'positive' : 'neutral'}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.passphrase')}
            value={
              walletFeatures.passphraseProtection
                ? translate('walletProvider.keepKey.settings.status.enabled')
                : translate('walletProvider.keepKey.settings.status.disabled')
            }
            valueDisposition={walletFeatures.passphraseProtection ? 'positive' : 'neutral'}
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
      <>
        <SubmenuHeader title={translate('walletProvider.keepKey.settings.headings.devicePin')} />
        <Button colorScheme='blue' ml={3}>
          {translate('walletProvider.keepKey.settings.actions.updatePin')}
        </Button>
      </>
    )
  }

  return (
    <Switch location={location} key={location.key}>
      <Route exact path={WalletConnectedRoutes.Connected} component={connectedMenu} />
      <Route exact path={WalletConnectedRoutes.KeepKey} component={keepKeyMenu} />
      <Route exact path={WalletConnectedRoutes.KeepKeyPin} component={changePin} />
    </Switch>
  )
}
